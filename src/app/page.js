"use client";

import { useSyncExternalStore } from "react";
import StepModules from "./stepModule/page";
import Calculator from "./Calculator/page";
import styles from "./page.module.css";

// ─── Root App ─────────────────────────────────────────────────────────────────
// Phase flow: modules → calculator
// localStorage keys: examCalc_v2_setup, examCalc_v2_modules

const emptyState = { phase: "modules", modules: [] };
let clientSnapshot;

const readStoredState = () => {
    if (typeof window === "undefined") return emptyState;

    try {
        const savedModules = localStorage.getItem("examCalc_v2_modules");
        const parsedModules = savedModules ? JSON.parse(savedModules) : [];
        return {
            modules: Array.isArray(parsedModules) ? parsedModules : [],
            phase:
                localStorage.getItem("examCalc_v2_setup") === "true"
                    ? "calculator"
                    : "modules",
        };
    } catch {
        return emptyState;
    }
};

const getSnapshot = () => {
    if (typeof window === "undefined") return emptyState;
    clientSnapshot ??= readStoredState();
    return clientSnapshot;
};

const subscribe = (onStoreChange) => {
    const handleStorageChange = () => {
        clientSnapshot = undefined;
        onStoreChange();
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("examCalc:changed", onStoreChange);
    return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("examCalc:changed", onStoreChange);
    };
};

const saveState = (modules, phase) => {
    clientSnapshot = { modules, phase };
    try {
        localStorage.setItem("examCalc_v2_modules", JSON.stringify(modules));
        localStorage.setItem("examCalc_v2_setup", phase === "calculator" ? "true" : "false");
    } catch {}
    window.dispatchEvent(new Event("examCalc:changed"));
};

export default function ExamCalc() {
    const { phase, modules } = useSyncExternalStore(
        subscribe,
        getSnapshot,
        () => emptyState,
    );

    const handleModules = (mods) => {
        saveState(mods, "calculator");
    };

    const handleEdit = (latestModules = modules) => {
        saveState(latestModules, "modules");
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
