"use client";

import { useState } from "react";
import styles from "./stepModule.module.css";

// ─── Internal: single component row ──────────────────────────────────────────
function ComponentRow({ index, comp, onChange, remaining, isDisabled }) {
    const [isPctFocused, setIsPctFocused] = useState(false);

    return (
        <div
            className={styles.componentRow}
            style={{ opacity: isDisabled ? 0.35 : 1 }}
        >
            <input
                disabled={isDisabled}
                value={comp.name}
                onChange={(e) => onChange(index, "name", e.target.value)}
                placeholder={`Assessment ${index + 1} (e.g. Test ${index + 1})`}
                className={`${styles.input} ${styles.componentInput}`}
            />
            <div className={styles.weightInputWrapper}>
                <input
                    disabled={isDisabled}
                    type="number"
                    min="0"
                    max="100"
                    value={comp.pct === 0 ? "" : comp.pct}
                    onFocus={() => setIsPctFocused(true)}
                    onBlur={() => setIsPctFocused(false)}
                    onChange={(e) => {
                        const val = Math.min(
                            remaining + comp.pct,
                            Math.max(0, Number(e.target.value) || 0),
                        );
                        onChange(index, "pct", val);
                    }}
                    placeholder="0"
                    className={`${styles.input} ${styles.weightInput}`}
                />
                {!isPctFocused && comp.pct === 0 && (
                    <span className={styles.percentSign}>%</span>
                )}
            </div>

            {comp.pct > 0 ? (
                <div className={styles.checkIndicator}>
                    <svg viewBox="0 0 12 12" className={styles.checkIcon}>
                        <polyline points="2,6 5,9 10,3" />
                    </svg>
                </div>
            ) : (
                <div className={styles.checkPlaceholder} />
            )}
        </div>
    );
}

// ─── Combined Setup: Module Count + Module Details ────────────────────────────
const COMPONENT_ROW_COUNT = 5;

function createBlankComponents() {
    return Array(COMPONENT_ROW_COUNT)
        .fill(null)
        .map(() => ({ name: "", pct: 0 }));
}

function normalizeComponents(components = []) {
    const prepared = components
        .slice(0, COMPONENT_ROW_COUNT)
        .map((c) => ({ name: c.name ?? "", pct: Number(c.pct) || 0 }));

    while (prepared.length < COMPONENT_ROW_COUNT) {
        prepared.push({ name: "", pct: 0 });
    }

    return prepared;
}

export default function StepModules({ initialModules = [], onNext }) {
    const blankModule = (id) => ({
        id,
        name: "",
        semester: "1",
        components: createBlankComponents(),
        marks: {},
        target: 75,
    });

    const [mods, setMods] = useState(() => {
        if (initialModules.length > 0) {
            return initialModules.map((m, i) => ({
                id: m.id ?? i,
                name: m.name ?? "",
                semester: m.semester ?? "1",
                components: normalizeComponents(m.components),
                marks: m.marks ?? {},
                target: m.target ?? 75,
            }));
        }
        return Array.from({ length: 5 }, (_, i) => blankModule(i));
    });

    const [moduleCount, setModuleCount] = useState(() =>
        initialModules.length > 0 ? initialModules.length : 5,
    );
    const [active, setActive] = useState(0);

    const initialModuleMap = new Map(initialModules.map((m) => [m.id, m]));

    const adjustModuleCount = (nextCount) => {
        const safeCount = Math.max(1, Math.min(12, nextCount));
        setModuleCount(safeCount);

        setMods((prev) => {
            if (safeCount === prev.length) return prev;
            if (safeCount < prev.length) return prev.slice(0, safeCount);

            const startId =
                prev.length > 0 ? Math.max(...prev.map((m) => m.id)) + 1 : 0;
            const additions = Array.from(
                { length: safeCount - prev.length },
                (_, i) => blankModule(startId + i),
            );
            return [...prev, ...additions];
        });

        setActive((prevActive) => Math.min(prevActive, safeCount - 1));
    };

    const updateMod = (i, field, val) =>
        setMods((prev) =>
            prev.map((m, idx) => (idx === i ? { ...m, [field]: val } : m)),
        );

    const updateComp = (modIdx, compIdx, field, val) =>
        setMods((prev) =>
            prev.map((m, idx) => {
                if (idx !== modIdx) return m;
                const comps = m.components.map((c, ci) =>
                    ci === compIdx ? { ...c, [field]: val } : c,
                );
                return { ...m, components: comps };
            }),
        );

    const getRemaining = (mod, compIdx) => {
        const used = mod.components.reduce(
            (s, c, ci) => s + (ci !== compIdx ? c.pct : 0),
            0,
        );
        return 100 - used;
    };

    const getTotal = (mod) => mod.components.reduce((s, c) => s + c.pct, 0);

    const isCompDisabled = (mod, idx) => {
        if (idx === 0) return false;
        const prev = mod.components[idx - 1];
        if (!prev.name.trim() || prev.pct === 0) return true;
        return getTotal(mod) >= 100 && mod.components[idx].pct === 0;
    };

    const isDone = (mod) => mod.name.trim() && getTotal(mod) === 100;
    const canSubmit = mods.every(isDone);

    const mod = mods[active];
    const total = getTotal(mod);
    const remaining = 100 - total;

    const handleSubmit = () => {
        const finalModules = mods.map((m) => {
            const prev = initialModuleMap.get(m.id);
            const activeComponentNames = new Set(
                m.components
                    .filter((c) => c.name.trim() && c.pct > 0)
                    .map((c) => c.name.trim()),
            );

            const preservedMarks = Object.fromEntries(
                Object.entries(prev?.marks ?? {}).filter(([name]) =>
                    activeComponentNames.has(name),
                ),
            );

            return {
                id: m.id,
                name: m.name.trim() || `Module ${m.id + 1}`,
                semester: m.semester,
                components: m.components.filter(
                    (c) => c.name.trim() && c.pct > 0,
                ),
                marks: preservedMarks,
                target: prev?.target ?? m.target ?? 75,
            };
        });
        onNext(finalModules);
    };

    const getTabClassName = (m, i) => {
        if (active === i) return `${styles.tab} ${styles.tabActive}`;
        if (isDone(m)) return `${styles.tab} ${styles.tabDone}`;
        return `${styles.tab} ${styles.tabDefault}`;
    };

    const getProgressColor = () => {
        if (total === 100) return styles.progressFillComplete;
        if (total > 80) return styles.progressFillHigh;
        return styles.progressFillNormal;
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                {/* Header */}
                <div className={styles.header}>
                    <span className={styles.stepBadge}>1</span>
                    <h1 className={styles.title}>Setup modules</h1>
                </div>
                <p className={styles.subtitle}>
                    Configure each module&apos;s name, semester, and year mark
                    breakdown — each must total 100%.
                </p>

                {/* Module count */}
                <div className={styles.countRow}>
                    <span className={styles.countLabel}>Number of modules</span>
                    <button
                        onClick={() => adjustModuleCount(moduleCount - 1)}
                        className={styles.counterBtn}
                        disabled={moduleCount <= 1}
                    >
                        −
                    </button>
                    <span className={styles.countNum}>{moduleCount}</span>
                    <button
                        onClick={() => adjustModuleCount(moduleCount + 1)}
                        className={styles.counterBtn}
                        disabled={moduleCount >= 12}
                    >
                        +
                    </button>
                    <span className={styles.countMax}>max 12</span>
                </div>

                {/* Module tabs */}
                <div className={styles.tabs}>
                    {mods.map((m, i) => (
                        <button
                            key={i}
                            onClick={() => setActive(i)}
                            className={getTabClassName(m, i)}
                        >
                            {m.name.trim() || `Module ${i + 1}`}
                            {isDone(m) && active !== i && " ✓"}
                        </button>
                    ))}
                </div>

                {/* Active module editor */}
                <div className={styles.editor}>
                    <div className={styles.nameGrid}>
                        <div>
                            <label className={styles.fieldLabel}>
                                Module name
                            </label>
                            <input
                                value={mod.name}
                                onChange={(e) =>
                                    updateMod(active, "name", e.target.value)
                                }
                                placeholder="e.g. Mathematics 101"
                                className={styles.input}
                            />
                        </div>
                        <div>
                            <label className={styles.fieldLabel}>
                                Semester
                            </label>
                            <select
                                value={mod.semester}
                                onChange={(e) =>
                                    updateMod(
                                        active,
                                        "semester",
                                        e.target.value,
                                    )
                                }
                                className={styles.input}
                            >
                                <option value="1">1st semester</option>
                                <option value="2">2nd semester</option>
                                <option value="year">Full year</option>
                            </select>
                        </div>
                    </div>

                    {/* Breakdown header */}
                    <div className={styles.breakdownHeader}>
                        <span className={styles.colLabel}>Assessment name</span>
                        <span
                            className={`${styles.colLabel} ${styles.colLabelRight}`}
                        >
                            Weight
                        </span>
                        <span />
                    </div>

                    <div className={styles.componentsList}>
                        {mod.components.map((comp, ci) => (
                            <ComponentRow
                                key={ci}
                                index={ci}
                                comp={comp}
                                onChange={(i, field, val) =>
                                    updateComp(active, i, field, val)
                                }
                                remaining={getRemaining(mod, ci)}
                                isDisabled={isCompDisabled(mod, ci)}
                            />
                        ))}
                    </div>

                    {/* Progress */}
                    <div className={styles.progressSection}>
                        <div className={styles.progressHeader}>
                            <span className={styles.progressLabel}>
                                Total allocated
                            </span>
                            <span
                                className={`${styles.progressValue} ${
                                    total === 100
                                        ? styles.textComplete
                                        : total > 0
                                          ? styles.textWarning
                                          : styles.textMuted
                                }`}
                            >
                                {total}%
                                {total === 100
                                    ? " — complete"
                                    : total > 0
                                      ? ` — ${remaining}% remaining`
                                      : ""}
                            </span>
                        </div>
                        <div className={styles.progressTrack}>
                            <div
                                className={`${styles.progressFill} ${getProgressColor()}`}
                                style={{ width: `${Math.min(total, 100)}%` }}
                            />
                        </div>
                        {total > 0 && total !== 100 && (
                            <p className={styles.warnMessage}>
                                Breakdown must total exactly 100% to continue.
                            </p>
                        )}
                        {total === 0 && (
                            <p className={styles.hintMessage}>
                                Add at least one assessment to get started.
                            </p>
                        )}
                    </div>
                </div>

                {/* Pagination */}
                <div className={styles.pagination}>
                    <button
                        onClick={() => setActive(Math.max(0, active - 1))}
                        disabled={active === 0}
                        className={styles.paginationBtn}
                    >
                        ← Prev
                    </button>
                    <span className={styles.pageInfo}>
                        {active + 1} / {moduleCount}
                    </span>
                    <button
                        onClick={() =>
                            setActive(Math.min(moduleCount - 1, active + 1))
                        }
                        disabled={active === moduleCount - 1}
                        className={styles.paginationBtn}
                    >
                        Next →
                    </button>
                </div>

                {/* Submit */}
                <div className={styles.actions}>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className={`${styles.submitBtn} ${!canSubmit ? styles.submitBtnDisabled : ""}`}
                    >
                        {canSubmit
                            ? "Start calculator →"
                            : `Complete all ${moduleCount} modules to continue`}
                    </button>
                </div>
            </div>
        </div>
    );
}
