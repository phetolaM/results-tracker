"use client"; // required in the Next.js App Router because of hooks; harmless elsewhere

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaStar } from "react-icons/fa";
import styles from "./calculator.module.css";

const joinList = (items) =>
    items.length <= 1
        ? items.join("")
        : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

// ─── Helper: Tooltip ───────────────────────────────────────────────────
function InfoTooltip({ text }) {
    const [pos, setPos] = useState(null);

    useEffect(() => {
        if (!pos) return;
        const hide = () => setPos(null);
        window.addEventListener("scroll", hide, true);
        return () => window.removeEventListener("scroll", hide, true);
    }, [pos]);

    const show = (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const below = r.top < 100; // flip below if too close to the top
        setPos({
            x: Math.min(
                Math.max(r.left + r.width / 2, 150),
                window.innerWidth - 150,
            ),
            y: below ? r.bottom : r.top,
            below,
        });
    };

    return (
        <span
            className={styles.tooltipWrapper}
            tabIndex={0}
            onMouseEnter={show}
            onMouseLeave={() => setPos(null)}
            onFocus={show}
            onBlur={() => setPos(null)}
            onClick={(e) => (pos ? setPos(null) : show(e))}
        >
            <span className={styles.tooltipIcon}>?</span>
            {pos &&
                createPortal(
                    <span
                        role="tooltip"
                        className={`${styles.tooltipPopup} ${pos.below ? styles.tooltipBelow : ""}`}
                        style={{ left: pos.x, top: pos.y }}
                    >
                        {text}
                    </span>,
                    document.body,
                )}
        </span>
    );
}

// ─── Calculator component ──────────────────────────────────────────────
export default function Calculator({
    modules = [],
    onEditModules = () => {},
} = {}) {
    const [mods, setMods] = useState(Array.isArray(modules) ? modules : []);

    useEffect(() => {
        if (!Array.isArray(mods) || mods.length === 0) return;
        try {
            localStorage.setItem("examCalc_v2_modules", JSON.stringify(mods));
            localStorage.setItem("examCalc_v2_setup", "true");
        } catch {}
    }, [mods]);

    // ── Helpers ───────────────────────────────────────────────────────────

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

    // Dynamic band color classes
    const getMarkBandClass = (val) => {
        if (val === "" || val === undefined || val === null) return "";
        const num = Number(val);
        if (num >= 75) return styles.markGreen;
        if (num >= 50) return styles.markPlain;
        return styles.markYellow;
    };

    // DP
    const getYearMarkClass = (val) => {
        if (val >= 40) return styles.badgeGreen;
        return styles.badgeRed;
    };

    // Exam results badge (top right of each module card)
    const getExamBadge = (mod, yearMark, examResult) => {
        if (yearMark === null || examResult === null) return null;
        const target = Number(mod.target);

        if (examResult === "no-qualify")
            return {
                text: "You don't qualify to write your exam",
                cls: styles.badgeRed,
            };
        if (target < 40)
            return { text: "You failed this module", cls: styles.badgeRed };
        if (examResult?.type === "sub-min")
            return {
                text: "You failed this module with a sub-minimum",
                cls: styles.badgeRed,
            };
        if (examResult === "impossible")
            return {
                text: "Target out of reach, even 100% in the exam isn't enough",
                cls: styles.badgeYellow,
            };
        if (target < 50)
            return {
                text: "You qualify to write a supplementary exam",
                cls: styles.badgeYellow,
            };
        if (target < 75)
            return { text: "You passed the module", cls: styles.badgeGreen };

        return {
            text: "You passed with distinction",
            cls: styles.badgeGreen,
            star: true,
        };
    };

    const getModuleComments = (mod, yearMark, examResult) => {
        if (yearMark === null) return [];

        if (yearMark < 40) {
            return [
                {
                    text: "Your DP/year mark is below 40%, so you don't qualify to write your exam.",
                },
            ];
        }

        const comments = [
            { text: "Your DP/year mark qualifies you to write the exam." },
        ];
        const target = Number(mod.target);

        if (examResult === "impossible") {
            comments.push({
                text: `Even a 100% exam mark cannot reach your final target of ${target}%.`,
            });
        } else if (examResult?.type === "sub-min") {
            comments.push({
                text: `Your exam aim of ${examResult.val}% is below the 40% exam sub-minimum, so you would fail with a sub-minimum.`,
            });
        } else if (examResult?.type === "ok") {
            comments.push({
                text: `To reach a final mark of ${target}%, you need at least ${examResult.val}% in the exam.`,
            });
        }

        return comments;
    };

    const calcRemainingHint = (mod) => {
        const filled = mod.components.filter(
            (c) => mod.marks[c.name] !== undefined && mod.marks[c.name] !== "",
        );
        const unfilled = mod.components.filter(
            (c) => mod.marks[c.name] === undefined || mod.marks[c.name] === "",
        );
        if (!unfilled.length) return null;

        const earnedWeighted = filled.reduce(
            (sum, c) => sum + (Number(mod.marks[c.name]) * c.pct) / 100,
            0,
        );
        const remainPct = unfilled.reduce((sum, c) => sum + c.pct, 0);

        const neededForQualify =
            remainPct > 0 ? ((40 - earnedWeighted) / remainPct) * 100 : null;

        const projectedYearMark = Math.max(
            40,
            earnedWeighted + (neededForQualify / 100) * remainPct,
        );

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

    // ── Summary / average computation ───────────────────────────────────
    const computeSummary = () => {
        const modulesWithYearMark = mods
            .map((m) => ({ mod: m, yearMark: calcYearMark(m) }))
            .filter((x) => x.yearMark !== null);

        // 1. & 2. Semester Targets
        const s1Mods = mods.filter((m) => String(m.semester) === "1");
        const s2Mods = mods.filter((m) => String(m.semester) === "2");

        const calcTargetAvg = (modList) => {
            const valid = modList.filter(
                (m) => m.target !== null && m.target !== "",
            );
            if (!valid.length) return 0;
            const sum = valid.reduce((acc, m) => acc + Number(m.target), 0);
            return sum / valid.length;
        };

        // 4. Modules at Risk Count
        let atRiskCount = 0;
        mods.forEach((m) => {
            const hint = calcRemainingHint(m);
            if (hint && hint.neededForQualify > 60) {
                atRiskCount++;
            }
        });

        const avgDP =
            modulesWithYearMark.length > 0
                ? modulesWithYearMark.reduce((s, x) => s + x.yearMark, 0) /
                  modulesWithYearMark.length
                : null;

        return {
            averageYearMark: avgDP,
            totalModules: mods.length,
            qualifiedCount: modulesWithYearMark.filter((x) => x.yearMark >= 40)
                .length,
            modulesWithMarks: modulesWithYearMark.length,

            hasS1: s1Mods.length > 0,
            hasS2: s2Mods.length > 0,
            s1TargetAvg: calcTargetAvg(s1Mods),
            s2TargetAvg: calcTargetAvg(s2Mods),
            totalTargetAvg: calcTargetAvg(mods),
            atRiskCount,
        };
    };

    const summary = computeSummary();

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className={styles.page}>
            {/* Page header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.mainTitle}>Exam Mark Tracker</h1>
                    <p className={styles.subtitle}>
                        Enter your marks below. The exam aim updates
                        automatically.
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
                {mods.length === 0 && (
                    <div className={styles.moduleCard}>
                        <div className={styles.commentBox}>
                            <p className={styles.commentLine}>
                                No modules configured yet. Go back to setup and
                                add at least one module to start calculating.
                            </p>
                        </div>
                    </div>
                )}

                {mods.map((mod) => {
                    const yearMark = calcYearMark(mod);
                    const examResult = calcExamAim(yearMark, mod.target);
                    const remainingHint = calcRemainingHint(mod);
                    const badge = getExamBadge(mod, yearMark, examResult);
                    const comments = getModuleComments(
                        mod,
                        yearMark,
                        examResult,
                    );
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
                        ? joinList(remainingHint.unfilled.map((c) => c.name))
                        : "";
                    const needText = remainingHint
                        ? joinList(
                              remainingHint.unfilled.map(
                                  (c) =>
                                      `${remainingHint.neededForQualify}% in ${c.name}`,
                              ),
                          )
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

                                {/* Exam results badge */}
                                {badge && (
                                    <div
                                        className={`${styles.examBadge} ${badge.cls}`}
                                    >
                                        {badge.star && (
                                            <FaStar
                                                className={styles.starIcon}
                                                aria-hidden="true"
                                            />
                                        )}
                                        {badge.text}
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
                                                {
                                                    label: "DP/Year Mark",
                                                    tip: "Your weighted average of all assessments before the exam. You need at least 40% to qualify to write the exam.",
                                                },
                                                {
                                                    label: "Final Target",
                                                    tip: "The final mark you want to achieve for this module. Final mark = 40% DP + 60% exam.",
                                                },
                                                {
                                                    label: "Exam Aim",
                                                    tip: "The minimum exam mark you need to reach your final target, based on your current DP/year mark.",
                                                },
                                            ].map((h) => (
                                                <th
                                                    key={h.label}
                                                    className={
                                                        styles.tableHeaderCell
                                                    }
                                                >
                                                    {h.label}
                                                    <InfoTooltip text={h.tip} />
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
                                                                className={`${styles.markInput} ${getMarkBandClass(val)}`}
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
                                                            className={`${styles.targetInput} ${getMarkBandClass(mod.target)}`}
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

                                        {/* Hint row */}
                                        {remainingHint && (
                                            <tr>
                                                <td
                                                    colSpan={
                                                        mod.components.length +
                                                        3
                                                    }
                                                    className={
                                                        styles.hintRowCell
                                                    }
                                                >
                                                    <p
                                                        className={
                                                            styles.inlineHintLine
                                                        }
                                                    >
                                                        {remainingHint.neededForQualify >
                                                        100 ? (
                                                            <span
                                                                className={
                                                                    styles.hintHighlightRed
                                                                }
                                                            >
                                                                Even 100% in{" "}
                                                                {remNames}{" "}
                                                                won&apos;t get
                                                                you to a DP of
                                                                40%.
                                                            </span>
                                                        ) : remainingHint.neededForQualify <=
                                                          0 ? (
                                                            <>
                                                                You&apos;ve
                                                                already secured
                                                                a DP of 40%, so
                                                                you qualify to
                                                                write the exam.
                                                            </>
                                                        ) : (
                                                            <>
                                                                To qualify for
                                                                the exam, you
                                                                need at least{" "}
                                                                <strong>
                                                                    {needText}
                                                                </strong>
                                                                .
                                                            </>
                                                        )}
                                                    </p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Comment box */}
                            {comments.length > 0 && (
                                <div className={styles.commentBox}>
                                    {comments.map((c, i) => (
                                        <p
                                            key={i}
                                            className={styles.commentLine}
                                        >
                                            {c.text}
                                        </p>
                                    ))}
                                </div>
                            )}

                            {/* Footnotes */}
                            {examResult?.type === "sub-min" && (
                                <p className={styles.footnoteSubMin}>
                                    * Sub-minimum: the calculated exam aim is
                                    below the 40% needed in the exam, so you
                                    would fail with a sub-minimum.
                                </p>
                            )}
                            {anyFilled && !allFilled && (
                                <p className={styles.footnotePartial}>
                                    {` Some assessment marks are still missing, so the DP and exam aim can't be calculated yet.`}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            {/* <div className={styles.legend}>
                <span>
                    DP = Duly Performed (year mark)
                    <InfoTooltip text="Your weighted average of all assessments before the exam. You need at least 40% to qualify to write the exam." />
                </span>
                <span>
                    Exam aim = exam mark needed to hit your final target
                </span>
                <span>
                    Final mark = 40% DP + 60% exam
                    <InfoTooltip text="The final mark is calculated as 40% of your DP plus 60% of your exam mark." />
                </span>
            </div> */}

            {/* Summary panel */}
            <div className={styles.summaryPanel}>
                {/* 1. Sem 1 Target Average */}
                <div className={styles.summaryCard}>
                    {summary.hasS1 ? (
                        <div className={styles.summaryValue}>
                            {summary.s1TargetAvg.toFixed(1)}%
                        </div>
                    ) : (
                        <div className={styles.summaryTextValue}>
                            No 1st semester modules
                        </div>
                    )}
                    <div className={styles.summaryLabel}>1st Semester Avg</div>
                </div>

                {/* 2. Sem 2 Target Average */}
                <div className={styles.summaryCard}>
                    {summary.hasS2 ? (
                        <div className={styles.summaryValue}>
                            {summary.s2TargetAvg.toFixed(1)}%
                        </div>
                    ) : (
                        <div className={styles.summaryTextValue}>
                            No 2nd semester modules
                        </div>
                    )}
                    <div className={styles.summaryLabel}>2nd Semester Avg</div>
                </div>

                {/* 3. Total Target Average */}
                <div className={styles.summaryCard}>
                    <div className={styles.summaryValue}>
                        {summary.totalModules > 0
                            ? `${summary.totalTargetAvg.toFixed(1)}%`
                            : "—"}
                    </div>
                    <div className={styles.summaryLabel}>
                        Total Avg for the year
                    </div>
                </div>

                {/* 4. Modules at Risk Count */}
                <div className={styles.summaryCard}>
                    <div
                        className={`${styles.summaryValue} ${summary.atRiskCount > 0 ? styles.summaryValueBad : styles.summaryValueGood}`}
                    >
                        {summary.atRiskCount}
                    </div>
                    <div className={styles.summaryLabel}>Modules at Risk</div>
                </div>

                {/* Qualified Count */}
                <div className={styles.summaryCard}>
                    <div
                        className={`${styles.summaryValue} ${
                            summary.modulesWithMarks === 0
                                ? styles.summaryValueMuted
                                : summary.qualifiedCount ===
                                    summary.modulesWithMarks
                                  ? styles.summaryValueGood
                                  : styles.summaryValueBad
                        }`}
                    >
                        {summary.qualifiedCount}/{summary.totalModules}
                    </div>
                    <div className={styles.summaryLabel}>
                        Qualified for exam
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className={styles.footer}>
                <p>
                    This website was built by{" "}
                    <a
                        href="https://mashashane-portfolio.vercel.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.footerLink}
                    >
                        Phetola Mashashane
                    </a>
                    .
                </p>
                <p>
                    Have a query or need a feature? Contact me on{" "}
                    <a href="tel:0662126872" className={styles.footerLink}>
                        066 212 6872
                    </a>{" "}
                    or{" "}
                    <a
                        href="mailto:pemashashane2@gmail.com"
                        className={styles.footerLink}
                    >
                        pemashashane2@gmail.com
                    </a>
                    .
                </p>
            </footer>
        </div>
    );
}
