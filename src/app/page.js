"use client";

import { useEffect, useState } from "react";
import StepModules from "./stepModule/page";
import Calculator from "./Calculator/page";
import styles from "./page.module.css";

// ─── Root App ─────────────────────────────────────────────────────────────────
// Phase flow: modules → calculator
// localStorage keys: examCalc_v2_setup, examCalc_v2_modules

export default function ExamCalc() {
    const [phase, setPhase] = useState("modules");
    const [modules, setModules] = useState([]);

    useEffect(() => {
        try {
            const savedModules = localStorage.getItem("examCalc_v2_modules");
            if (savedModules) {
                setModules(JSON.parse(savedModules));
            }

            setPhase(
                localStorage.getItem("examCalc_v2_setup") === "true"
                    ? "calculator"
                    : "modules",
            );
        } catch {
            setPhase("modules");
        }
    }, []);

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
