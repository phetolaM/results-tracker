"use client";

import { useState } from "react";
import StepModules from "./stepModule/page";
import Calculator from "./Calculator/page";
import styles from "./page.module.css";

// ─── Root App ─────────────────────────────────────────────────────────────────
// Phase flow: modules → calculator
// localStorage keys: examCalc_v2_setup, examCalc_v2_modules

export default function ExamCalc() {
    const [phase, setPhase] = useState(() => {
        try {
            return localStorage.getItem("examCalc_v2_setup") === "true"
                ? "calculator"
                : "modules";
        } catch {
            return "modules";
        }
    });

    const [modules, setModules] = useState(() => {
        try {
            const s = localStorage.getItem("examCalc_v2_modules");
            return s ? JSON.parse(s) : [];
        } catch {
            return [];
        }
    });

    const handleModules = (mods) => {
        setModules(mods);
        try {
            localStorage.setItem("examCalc_v2_modules", JSON.stringify(mods));
            localStorage.setItem("examCalc_v2_setup", "true");
        } catch {}
        setPhase("calculator");
    };

    const handleEdit = (latestModules = modules) => {
        setModules(latestModules);
        try {
            localStorage.setItem(
                "examCalc_v2_modules",
                JSON.stringify(latestModules),
            );
        } catch {}
        setPhase("modules");
    };

    return (
        <div className={styles.container}>
            {phase === "modules" && (
                <StepModules initialModules={modules} onNext={handleModules} />
            )}
            {phase === "calculator" && (
                <Calculator modules={modules} onEditModules={handleEdit} />
            )}
        </div>
    );
}
