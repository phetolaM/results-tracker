"use client";

import { useState, useEffect } from "react";
import styles from "./calculator.module.css";

// ─── Calculator ───────────────────────────────────────────────────────────────
// Props:
//   modules[]        — array of module objects from StepModules
//   onEditModules()  — callback to go back to setup

export default function Calculator({ modules, onEditModules }) {
    const [mods, setMods] = useState(modules);

    useEffect(() => {
        setMods(modules);
    }, [modules]);

    // ── Helpers ────────────────────────────────────────────────────────────────

    const updateMark = (modId, compName, val) =>
        setMods((prev) =>
            prev.map((m) =>
                m.id !== modId
                    ? m
                    : { ...m, marks: { ...m.marks, [compName]: val } },
            ),
        );

    const updateTarget = (modId, val) =>
        setMods((prev) =>
            prev.map((m) => (m.id !== modId ? m : { ...m, target: val })),
        );

    const calcYearMark = (mod) => {
        const comps = mod.components;
        if (!comps.length) return null;
        let total = 0,
            weightUsed = 0;
        for (const c of comps) {
            const v = mod.marks[c.name];
            if (v !== undefined && v !== "") {
                total += (Number(v) * c.pct) / 100;
                weightUsed += c.pct;
            }
        }
        if (weightUsed === 0) return null;
        return weightUsed < 100 ? null : total;
    };

    const calcExamAim = (yearMark, target) => {
        if (yearMark === null) return null;
        if (yearMark < 40) return "no-qualify";
        const needed = (target - yearMark * 0.4) / 0.6;
        if (needed > 100) return "impossible";
        const r = Math.ceil(needed);
        return r < 40 ? { type: "sub-min", val: r } : { type: "ok", val: r };
    };

    const semesterLabel = (s) => (s === "year" ? "Full Year" : `Semester ${s}`);

    const getExamBadgeClass = (examResult) => {
        if (examResult === "no-qualify") return styles.badgeNoQualify;
        if (examResult === "impossible") return styles.badgeImpossible;
        if (examResult?.type === "sub-min") return styles.badgeSubMin;
        if (examResult?.type === "ok") return styles.badgeOk;
        return "";
    };

    const getExamBadgeText = (examResult) => {
        if (examResult === "no-qualify") return "✗ Doesn't qualify (YM < 40%)";
        if (examResult === "impossible") return "Impossible to pass";
        if (examResult?.type === "sub-min")
            return `Exam aim: ${examResult.val}% (sub-min!)`;
        if (examResult?.type === "ok") return `Exam aim: ${examResult.val}%`;
        return "";
    };

    const getYearMarkClass = (yearMark) => {
        if (yearMark >= 40) return styles.yearMarkGood;
        return styles.yearMarkBad;
    };

    const getFinalBandLabel = (mark) => {
        if (mark >= 75) return "distinction";
        if (mark >= 50) return "pass";
        if (mark >= 40) return "supplementary";
        return "fail";
    };

    const getModuleComments = (mod, yearMark, examResult) => {
        if (yearMark === null) {
            return [
                "Enter all assessment marks to calculate the year mark and exam aim.",
            ];
        }

        const comments = [];
        const targetBand = getFinalBandLabel(mod.target);

        if (yearMark < 40) {
            comments.push(
                `Year mark ${yearMark.toFixed(1)}% is below 40%, so this module does not qualify for the exam.`,
            );
        } else {
            comments.push(
                `Year mark ${yearMark.toFixed(1)}% qualifies you to write the exam.`,
            );
        }

        if (yearMark >= 40) {
            if (examResult === "impossible") {
                comments.push(
                    `Even a 100% exam mark cannot reach the final target of ${mod.target}%.`,
                );
            } else if (examResult?.type === "sub-min") {
                comments.push(
                    `To reach a final mark of ${mod.target}%, you need at least ${examResult.val}% in the exam, but the exam still requires a minimum of 50% to pass.`,
                );
            } else if (examResult?.type === "ok") {
                comments.push(
                    `To reach a final mark of ${mod.target}%, you need at least ${examResult.val}% in the exam.`,
                );
            }
        }

        comments.push(
            `Final mark guide: 40-49% = supplementary, 50-74% = pass, 75%+ = distinction (${targetBand} target).`,
        );

        return comments;
    };

    const calcRemainingHint = (mod) => {
        const filled = mod.components.filter(
            (c) => mod.marks[c.name] !== undefined && mod.marks[c.name] !== "",
        );
        const unfilled = mod.components.filter(
            (c) => mod.marks[c.name] === undefined || mod.marks[c.name] === "",
        );
        if (!filled.length || !unfilled.length) return null;

        const earnedWeighted = filled.reduce(
            (sum, c) => sum + (Number(mod.marks[c.name]) * c.pct) / 100,
            0,
        );
        const remainPct = unfilled.reduce((sum, c) => sum + c.pct, 0);

        // What score on remaining tasks hits exactly 40% year mark?
        const neededForQualify =
            remainPct > 0 ? ((40 - earnedWeighted) / remainPct) * 100 : null;

        // Projected year mark IF user scores neededForQualify on remaining tasks
        const projectedYearMark = Math.max(
            40,
            earnedWeighted + (neededForQualify / 100) * remainPct,
        );

        // Exam aim at that projected year mark
        const examAimAtTarget =
            mod.target !== null
                ? Math.ceil((mod.target - projectedYearMark * 0.4) / 0.6)
                : null;

        return {
            unfilled,
            neededForQualify:
                neededForQualify !== null ? Math.ceil(neededForQualify) : null,
            projectedYearMark: projectedYearMark.toFixed(1),
            examAimAtTarget,
            target: mod.target,
        };
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className={styles.page}>
            {/* Page header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.mainTitle}>Exam Mark Tracker</h1>
                    <p className={styles.subtitle}>
                        Enter your marks below — exam aim updates automatically.
                    </p>
                </div>
                <button
                    onClick={() => onEditModules(mods)}
                    className={`${styles.btn} ${styles.btnSecondary}`}
                >
                    ⚙ Edit Modules
                </button>
            </div>

            {/* Module cards */}
            <div className={styles.moduleList}>
                {mods.map((mod) => {
                    const yearMark = calcYearMark(mod);
                    const examResult = calcExamAim(yearMark, mod.target);
                    const remainingHint = calcRemainingHint(mod);
                    const allFilled = mod.components.every(
                        (c) =>
                            mod.marks[c.name] !== undefined &&
                            mod.marks[c.name] !== "",
                    );
                    const anyFilled = mod.components.some(
                        (c) =>
                            mod.marks[c.name] !== undefined &&
                            mod.marks[c.name] !== "",
                    );

                    const remNames = remainingHint
                        ? remainingHint.unfilled.length === 1
                            ? remainingHint.unfilled[0].name
                            : remainingHint.unfilled
                                  .map((c) => c.name)
                                  .join(" and ")
                        : "";

                    return (
                        <div key={mod.id} className={styles.moduleCard}>
                            {/* Module header band */}
                            <div className={styles.moduleHeader}>
                                <div className={styles.moduleTitleGroup}>
                                    <span className={styles.moduleName}>
                                        {mod.name}
                                    </span>
                                    <span className={styles.semesterBadge}>
                                        {semesterLabel(mod.semester)}
                                    </span>
                                </div>

                                {/* Exam aim badge */}
                                {examResult && (
                                    <div
                                        className={`${styles.examBadge} ${getExamBadgeClass(examResult)}`}
                                    >
                                        {getExamBadgeText(examResult)}
                                    </div>
                                )}
                            </div>

                            {/* Data table */}
                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr className={styles.tableHeader}>
                                            {mod.components.map((c) => (
                                                <th
                                                    key={c.name}
                                                    className={
                                                        styles.tableHeaderCell
                                                    }
                                                >
                                                    {c.name}
                                                    <span
                                                        className={
                                                            styles.weightLabel
                                                        }
                                                    >
                                                        {c.pct}% weight
                                                    </span>
                                                </th>
                                            ))}
                                            {[
                                                "Year Mark",
                                                "Final Target",
                                                "Exam Aim",
                                            ].map((h) => (
                                                <th
                                                    key={h}
                                                    className={
                                                        styles.tableHeaderCell
                                                    }
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            {/* Mark inputs */}
                                            {mod.components.map((c) => {
                                                const val =
                                                    mod.marks[c.name] ?? "";
                                                const num = Number(val);
                                                const low =
                                                    val !== "" && num < 50;
                                                return (
                                                    <td
                                                        key={c.name}
                                                        className={
                                                            styles.tableCell
                                                        }
                                                    >
                                                        <div
                                                            className={
                                                                styles.inputWrapper
                                                            }
                                                        >
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={val}
                                                                onChange={(e) =>
                                                                    updateMark(
                                                                        mod.id,
                                                                        c.name,
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="—"
                                                                className={`${styles.markInput} ${low ? styles.markInputLow : ""}`}
                                                            />
                                                            <span
                                                                className={
                                                                    styles.inputPercent
                                                                }
                                                            >
                                                                %
                                                            </span>
                                                        </div>
                                                    </td>
                                                );
                                            })}

                                            {/* Year mark */}
                                            <td className={styles.tableCell}>
                                                {yearMark !== null ? (
                                                    <div
                                                        className={`${styles.yearMark} ${getYearMarkClass(yearMark)}`}
                                                    >
                                                        {yearMark.toFixed(1)}%
                                                    </div>
                                                ) : (
                                                    <span
                                                        className={
                                                            styles.placeholder
                                                        }
                                                    >
                                                        {allFilled
                                                            ? "—"
                                                            : "Enter all marks"}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Target input */}
                                            <td className={styles.tableCell}>
                                                {examResult === "no-qualify" ? (
                                                    <span
                                                        className={
                                                            styles.naText
                                                        }
                                                    >
                                                        N/A
                                                    </span>
                                                ) : (
                                                    <div
                                                        className={
                                                            styles.inputWrapper
                                                        }
                                                    >
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={mod.target}
                                                            onChange={(e) =>
                                                                updateTarget(
                                                                    mod.id,
                                                                    Number(
                                                                        e.target
                                                                            .value,
                                                                    ) || 0,
                                                                )
                                                            }
                                                            className={
                                                                styles.targetInput
                                                            }
                                                        />
                                                        <span
                                                            className={
                                                                styles.inputPercent
                                                            }
                                                        >
                                                            %
                                                        </span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Exam aim */}
                                            <td className={styles.tableCell}>
                                                {examResult === null && (
                                                    <span
                                                        className={
                                                            styles.placeholder
                                                        }
                                                    >
                                                        —
                                                    </span>
                                                )}
                                                {examResult ===
                                                    "no-qualify" && (
                                                    <span
                                                        className={
                                                            styles.resultNa
                                                        }
                                                    >
                                                        N/A
                                                    </span>
                                                )}
                                                {examResult ===
                                                    "impossible" && (
                                                    <span
                                                        className={
                                                            styles.resultImpossible
                                                        }
                                                    >
                                                        Impossible
                                                    </span>
                                                )}
                                                {examResult?.type ===
                                                    "sub-min" && (
                                                    <span
                                                        className={
                                                            styles.resultSubMin
                                                        }
                                                    >
                                                        {examResult.val}%*
                                                    </span>
                                                )}
                                                {examResult?.type === "ok" && (
                                                    <span
                                                        className={
                                                            styles.resultOk
                                                        }
                                                    >
                                                        {examResult.val}%
                                                    </span>
                                                )}
                                            </td>
                                        </tr>

                                        {remainingHint && (
                                            <tr>
                                                <td
                                                    colSpan={
                                                        mod.components.length
                                                    }
                                                    className={
                                                        styles.hintRowCell
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.wideHintBox
                                                        }
                                                    >
                                                        {remainingHint.neededForQualify >
                                                        100 ? (
                                                            <p
                                                                className={
                                                                    styles.inlineHintLine
                                                                }
                                                            >
                                                                A year mark of
                                                                40% is no longer
                                                                achievable with
                                                                remaining tasks.
                                                            </p>
                                                        ) : remainingHint.neededForQualify <=
                                                          0 ? (
                                                            <p
                                                                className={
                                                                    styles.inlineHintLine
                                                                }
                                                            >
                                                                You&apos;ve
                                                                already secured
                                                                a qualifying
                                                                year mark.
                                                            </p>
                                                        ) : (
                                                            <p
                                                                className={
                                                                    styles.inlineHintLine
                                                                }
                                                            >
                                                                To reach a year
                                                                mark of{" "}
                                                                <span
                                                                    className={
                                                                        styles.hintHighlightRed
                                                                    }
                                                                >
                                                                    40%
                                                                </span>
                                                                , you need at
                                                                least{" "}
                                                                <span
                                                                    className={
                                                                        styles.hintHighlightRed
                                                                    }
                                                                >
                                                                    {
                                                                        remainingHint.neededForQualify
                                                                    }
                                                                    %
                                                                </span>{" "}
                                                                in {remNames}.
                                                            </p>
                                                        )}

                                                        {remainingHint.examAimAtTarget !==
                                                            null &&
                                                            remainingHint.neededForQualify <=
                                                                100 && (
                                                                <p
                                                                    className={
                                                                        styles.inlineHintLine
                                                                    }
                                                                >
                                                                    With year
                                                                    mark{" "}
                                                                    {
                                                                        remainingHint.projectedYearMark
                                                                    }
                                                                    %, exam aim
                                                                    for{" "}
                                                                    {
                                                                        remainingHint.target
                                                                    }
                                                                    % is{" "}
                                                                    <span
                                                                        className={
                                                                            styles.hintHighlightBlue
                                                                        }
                                                                    >
                                                                        {
                                                                            remainingHint.examAimAtTarget
                                                                        }
                                                                        %
                                                                    </span>
                                                                    .
                                                                </p>
                                                            )}
                                                    </div>
                                                </td>
                                                <td
                                                    colSpan={3}
                                                    className={
                                                        styles.hintRowSpacer
                                                    }
                                                />
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Sub-min footnote */}
                            {examResult?.type === "sub-min" && (
                                <div className={styles.footnoteSubMin}>
                                    * Sub-minimum — a mark below 40% in the exam
                                    means failing the module even if your final
                                    mark is above 50%.
                                </div>
                            )}
                            {/* Result comments */}
                            <div className={styles.commentBox}>
                                {getModuleComments(
                                    mod,
                                    yearMark,
                                    examResult,
                                ).map((line, index) => (
                                    <p
                                        key={index}
                                        className={styles.commentLine}
                                    >
                                        {line}
                                    </p>
                                ))}
                            </div>

                            {/* Partial marks hint */}
                            {!allFilled && anyFilled && (
                                <div className={styles.footnotePartial}>
                                    ℹ Year mark will show once all{" "}
                                    {mod.components.length} assessment marks are
                                    entered.
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className={styles.legend}>
                <span>Formula: Year Mark × 40% + Exam × 60% = Final Mark</span>
                <span>•</span>
                <span>Year Mark must be ≥ 40% to qualify for exams</span>
                <span>•</span>
                <span>Exam must be ≥ 50% to pass</span>
                <span>•</span>
                <span>
                    Final mark 40-49% = supplementary, 50-74% = pass, 75%+ =
                    distinction
                </span>
            </div>
        </div>
    );
}
