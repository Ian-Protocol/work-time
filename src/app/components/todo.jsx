"use client";

import { useEffect, useMemo, useState } from "react";

const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60)
        .toString()
        .padStart(2, "0");
    const seconds = Math.floor(totalSeconds % 60)
        .toString()
        .padStart(2, "0");
    return `${minutes}:${seconds}`;
};

const calculatePoints = (task) => {
    if (task.remaining <= 0) {
        return 0;
    }
    const timeSpent = task.duration - task.remaining;
    const percentUsed = timeSpent / task.duration;

    if (percentUsed < 0.7) {
        return 3;
    }

    return 2;
};

const PixelScene = () => (
    <svg
        viewBox="0 0 320 180"
        role="img"
        aria-label="Pixel art room with a cozy bear waiting for tasks"
        className="h-auto w-full"
        xmlns="http://www.w3.org/2000/svg"
    >
        <rect width="320" height="120" fill="#f7c89c" />
        <rect y="120" width="320" height="60" fill="#c98457" />
        <rect y="118" width="320" height="4" fill="#b87345" />

        <rect x="40" y="22" width="56" height="38" fill="#ffe0b8" stroke="#ac6b3a" strokeWidth="4" />
        <rect x="44" y="26" width="48" height="30" fill="#86c292" />

        <rect x="230" y="18" width="60" height="42" fill="#ffe0b8" stroke="#ac6b3a" strokeWidth="4" />
        <rect x="234" y="22" width="52" height="34" fill="#f7cfaa" />
        <rect x="244" y="52" width="4" height="12" fill="#ac6b3a" />

        <rect x="130" y="22" width="32" height="32" fill="#ffe0b8" stroke="#ac6b3a" strokeWidth="4" />
        <rect x="138" y="30" width="16" height="16" fill="#f4815e" />

        <rect x="72" y="120" width="60" height="32" fill="#b46c40" />
        <rect x="76" y="124" width="52" height="24" fill="#f4b284" />
        <rect x="80" y="108" width="10" height="16" fill="#f4b284" />
        <rect x="86" y="108" width="6" height="16" fill="#ac6b3a" />
        <rect x="110" y="108" width="16" height="16" fill="#d9774c" />

        <rect x="188" y="120" width="90" height="32" rx="4" fill="#cd7f58" />
        <rect x="184" y="104" width="98" height="24" rx="6" fill="#f6b487" />
        <rect x="178" y="120" width="8" height="32" fill="#95512f" />
        <rect x="280" y="120" width="8" height="32" fill="#95512f" />
        <rect x="206" y="108" width="36" height="10" fill="#fbe4cc" />

        <rect x="120" y="128" width="80" height="12" rx="6" fill="#fdddbf" />

        <rect x="152" y="70" width="16" height="36" fill="#8a4b2d" />
        <rect x="140" y="70" width="44" height="32" rx="4" fill="#a7633b" />
        <rect x="140" y="60" width="12" height="16" rx="6" fill="#8a4b2d" />
        <rect x="172" y="60" width="12" height="16" rx="6" fill="#8a4b2d" />
        <rect x="148" y="84" width="8" height="12" fill="#f2b784" />
        <rect x="168" y="84" width="8" height="12" fill="#f2b784" />
        <rect x="160" y="104" width="12" height="12" fill="#8a4b2d" />

        <rect x="150" y="66" width="6" height="6" fill="#3b1f16" />
        <rect x="170" y="66" width="6" height="6" fill="#3b1f16" />
        <rect x="162" y="76" width="6" height="6" fill="#3b1f16" />
    </svg>
);

export default function Todo() {
    const [tasks, setTasks] = useState([]);
    const [taskName, setTaskName] = useState("");
    const [durationInput, setDurationInput] = useState("25");
    const [error, setError] = useState("");
    const [wizardStep, setWizardStep] = useState(1);
    const [isWizardComplete, setIsWizardComplete] = useState(false);
    const [taskMode, setTaskMode] = useState("manual");
    const [aiTaskPrompt, setAiTaskPrompt] = useState("");
    const [aiTaskError, setAiTaskError] = useState("");
    const [aiTaskInfo, setAiTaskInfo] = useState("");
    const [isAiTaskLoading, setIsAiTaskLoading] = useState(false);
    const [avatarSprites, setAvatarSprites] = useState(null);
    const [avatarError, setAvatarError] = useState("");
    const [avatarInfo, setAvatarInfo] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [isAvatarLoading, setIsAvatarLoading] = useState(false);
    const [bearStatus, setBearStatus] = useState({
        feelingSummary: "",
        buddyNote: "",
    });
    const [bearStatusError, setBearStatusError] = useState("");
    const [isFetchingBear, setIsFetchingBear] = useState(false);
    const isManualMode = taskMode === "manual";

    const appendTask = (title, durationMinutes) => {
        const trimmedTitle = (title ?? "").trim();

        if (!trimmedTitle) {
            throw new Error("Give the task a name before adding it.");
        }

        if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
            throw new Error("Duration must be a number greater than 0.");
        }

        const durationInSeconds = Math.max(5, Math.round(durationMinutes * 60));
        const newTask = {
            id: Date.now(),
            title: trimmedTitle,
            duration: durationInSeconds,
            remaining: durationInSeconds,
            isRunning: false,
            isCompleted: false,
            points: null,
        };

        setTasks((prev) => [...prev, newTask]);
        return newTask;
    };

    const hasRunningTasks = useMemo(
        () =>
            tasks.some(
                (task) =>
                    task.isRunning && !task.isCompleted && task.remaining > 0,
            ),
        [tasks],
    );

    const totalPoints = useMemo(
        () => tasks.reduce((sum, task) => sum + (task.points ?? 0), 0),
        [tasks],
    );

    const derivedMood = useMemo(() => {
        const feeling = (bearStatus.feelingSummary ?? "").toLowerCase();
        if (feeling.includes("happy") || feeling.includes("proud") || feeling.includes("glow")) {
            return "happy";
        }
        if (feeling.includes("sad") || feeling.includes("tired")) {
            return "sad";
        }
        if (feeling.includes("curious") || feeling.includes("excited")) {
            return "curious";
        }

        if (tasks.some((task) => task.isRunning)) {
            return "curious";
        }
        if (tasks.some((task) => task.isCompleted && (task.points ?? 0) >= 2)) {
            return "happy";
        }
        return "sad";
    }, [bearStatus.feelingSummary, tasks]);

    useEffect(() => {
        if (!hasRunningTasks) return undefined;

        const interval = setInterval(() => {
            setTasks((prev) =>
                prev.map((task) => {
                    if (!task.isRunning || task.isCompleted || task.remaining <= 0) {
                        return task;
                    }

                    const nextRemaining = task.remaining - 1;

                    if (nextRemaining <= 0) {
                        return {
                            ...task,
                            remaining: 0,
                            isRunning: false,
                            isCompleted: true,
                            points: 0,
                        };
                    }

                    return { ...task, remaining: nextRemaining };
                }),
            );
        }, 1000);

        return () => clearInterval(interval);
    }, [hasRunningTasks]);

    const handleAddTask = (event) => {
        event.preventDefault();
        setError("");

        try {
            const parsedMinutes = Number.parseFloat(durationInput);
            appendTask(taskName, parsedMinutes);
            setTaskName("");
            setDurationInput("25");
        } catch (taskError) {
            setError(taskError?.message ?? "Unable to add that task.");
        }
    };

    const handleToggleTimer = (id) => {
        setTasks((prev) =>
            prev.map((task) => {
                if (task.id !== id || task.isCompleted) {
                    return task;
                }

                if (task.remaining <= 0) {
                    return { ...task, isRunning: false };
                }

                return { ...task, isRunning: !task.isRunning };
            }),
        );
    };

    const handleCompleteTask = (id) => {
        setTasks((prev) =>
            prev.map((task) => {
                if (task.id !== id || task.isCompleted || task.remaining <= 0) {
                    return task;
                }

                const points = calculatePoints(task);
                return {
                    ...task,
                    isRunning: false,
                    isCompleted: true,
                    points,
                };
            }),
        );
    };

    const handleDeleteTask = (id) => {
        setTasks((prev) => prev.filter((task) => task.id !== id));
    };

    const handleWizardNav = (step) => {
        setWizardStep(step);
        if (step > 1) {
            setIsWizardComplete(true);
        }
    };

    const handleToggleTaskMode = () => {
        setTaskMode((prev) => (prev === "manual" ? "ai" : "manual"));
        setAiTaskError("");
        setAiTaskInfo("");
    };

    const handleCreateTaskFromPrompt = async () => {
        const cleanedPrompt = aiTaskPrompt.trim();
        if (!cleanedPrompt) {
            setAiTaskError("Describe what you'd like me to plan.");
            setAiTaskInfo("");
            return;
        }

        setAiTaskError("");
        setAiTaskInfo("");
        setIsAiTaskLoading(true);

        try {
            const response = await fetch("/api/task-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: cleanedPrompt }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.error ?? "I couldn't interpret that task.");
            }

            let suggestedTasks = Array.isArray(data?.tasks) ? data.tasks : [];
            if (!suggestedTasks.length && data?.title) {
                suggestedTasks = [{ title: data.title, durationMinutes: data?.durationMinutes }];
            }

            const addedTitles = [];
            suggestedTasks.forEach((task) => {
                try {
                    appendTask(task?.title, task?.durationMinutes);
                    if (task?.title) {
                        addedTitles.push(task.title.trim());
                    }
                } catch (taskError) {
                    console.error("Unable to add AI task", taskError);
                }
            });

            if (addedTitles.length === 0) {
                throw new Error("The bear couldn't translate that into anything actionable.");
            }

            setAiTaskPrompt("");
            setAiTaskInfo(
                addedTitles.length === 1
                    ? `Added "${addedTitles[0]}".`
                    : `Added ${addedTitles.length} tasks: ${addedTitles.join(", ")}.`,
            );
        } catch (requestError) {
            setAiTaskError(requestError?.message ?? "The bear got confused. Try again?");
            setAiTaskInfo("");
        } finally {
            setIsAiTaskLoading(false);
        }
    };

    const handleAvatarFileChange = (event) => {
        const file = event.target.files?.[0];
        setSelectedAvatar(file ?? null);
        setAvatarError("");
        setAvatarInfo(file ? `Ready to pixelate ${file.name}` : "");
    };

    const handleGenerateAvatar = async () => {
        if (!selectedAvatar) {
            setAvatarError("Pick a photo before generating a sprite.");
            setAvatarInfo("");
            return;
        }

        setAvatarError("");
        setAvatarInfo("Generating sprite set...");
        setIsAvatarLoading(true);

        try {
            const formData = new FormData();
            formData.append("photo", selectedAvatar);

            const response = await fetch("/api/avatar", {
                method: "POST",
                body: formData,
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.error ?? "Sprite magic failed. Try another photo.");
            }

            setAvatarSprites(data?.sprites ?? null);
            setAvatarInfo("Sprite set ready! It will react to your bear's mood.");
        } catch (uploadError) {
            setAvatarError(uploadError?.message ?? "We couldn't create a sprite from that image.");
            setAvatarInfo("");
        } finally {
            setIsAvatarLoading(false);
        }
    };

    const handleCheckBearBuddy = async () => {
        setIsFetchingBear(true);
        setBearStatusError("");

        try {
            const response = await fetch("/api/bear-status", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tasksSnapshot: tasks.map((task) => ({
                        title: task.title,
                        isRunning: task.isRunning,
                        isCompleted: task.isCompleted,
                        duration: task.duration,
                        remaining: task.remaining,
                    })),
                }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.error ?? "Bear buddy could not respond.");
            }

            setBearStatus({
                feelingSummary: data?.feelingSummary ?? "",
                buddyNote: data?.buddyNote ?? "",
            });
        } catch (requestError) {
            setBearStatusError(requestError?.message ?? "Failed to reach the bear buddy.");
        } finally {
            setIsFetchingBear(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#fcd3b6] text-[#5b2f16]">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-8">
                <section className="w-full rounded-[32px] border-4 border-[#f1b487] bg-[#fbe0c6] p-4 shadow-[0_12px_0_#d18f63]">
                    <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-[24px] border-2 border-[#c87d4c] bg-[#f6bf8f]">
                        {avatarSprites?.[derivedMood] ? (
                            <img
                                src={avatarSprites[derivedMood]}
                                alt={`${derivedMood} companion sprite`}
                                className="h-48 w-48 object-contain"
                            />
                        ) : (
                            <PixelScene />
                        )}
                    </div>
                </section>

                <header className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-[#522a11] sm:text-4xl">
                        Focus buddy
                    </h1>
                    <p className="text-base text-[#6f3d1e] sm:text-lg">
                        Upload a buddy, then run one task at a time. Finish early to score points.
                    </p>
                </header>

                {wizardStep === 1 ? (
                    <section className="flex flex-col gap-4 rounded-[32px] border-4 border-[#f0c6a1] bg-[#fffaf3] p-6 shadow-[0_8px_0_#e7a977]">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.35rem] text-[#b26233]">
                                Step 1 · Sprite setup
                            </p>
                            <p className="text-sm text-[#6f3d1e]">
                                Drop one image. We&apos;ll build happy, curious, and sad moods from it.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 rounded-[24px] border-2 border-dashed border-[#f1d1b4] bg-white/80 p-4">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarFileChange}
                                className="text-sm text-[#5b2f16] file:mr-3 file:rounded-full file:border-0 file:bg-[#f3c498] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#5b2f16] file:shadow-[0_3px_0_#c6834f]"
                            />
                            <button
                                type="button"
                                onClick={handleGenerateAvatar}
                                disabled={isAvatarLoading}
                                className="rounded-[24px] bg-[#f19c57] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_4px_0_#c67434] transition hover:-translate-y-0.5 hover:bg-[#f3a96f] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isAvatarLoading ? "Pixelating..." : "Generate sprite set"}
                            </button>
                            {avatarInfo && <p className="text-sm text-[#3b7a52]">{avatarInfo}</p>}
                            {avatarError && (
                                <p className="text-sm text-[#c2473d]" role="alert">
                                    {avatarError}
                                </p>
                            )}
                            {avatarSprites && (
                                <div className="grid grid-cols-3 gap-2 rounded-[18px] bg-[#fff6ed] p-2">
                                    {["happy", "curious", "sad"].map((mood) => (
                                        <div key={mood} className="flex flex-col items-center gap-1 text-center">
                                            <div className="text-xs font-semibold uppercase tracking-[0.1rem] text-[#a5643e]">
                                                {mood}
                                            </div>
                                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[#f3c498] bg-white/90 p-1">
                                                {avatarSprites?.[mood] ? (
                                                    <img
                                                        src={avatarSprites[mood]}
                                                        alt={`${mood} sprite`}
                                                        className="h-full w-full object-contain"
                                                    />
                                                ) : (
                                                    <span className="text-[10px] text-[#c8a48b]">Pending</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => handleWizardNav(2)}
                            className="self-end rounded-[24px] border-2 border-[#33b074] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-[#33b074] transition hover:bg-[#33b074] hover:text-white"
                        >
                            Continue to tasks
                        </button>
                    </section>
                ) : (
                    <section className="rounded-[32px] border-4 border-[#f3c498] bg-[#fff2e2] p-6 shadow-[0_10px_0_#f0b88b]">
                        <div className="flex items-center justify-between gap-3 text-left">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.35rem] text-[#b26233]">
                                    Step 2 · Plan a task
                                </p>
                                <p className="text-sm text-[#6f3d1e]">Use AI or keep it manual.</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleToggleTaskMode}
                                className="rounded-[20px] border-2 border-[#f1d4bb] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#8a4d2c] transition hover:border-[#f19c57]"
                            >
                                {isManualMode ? "Use AI prompt" : "Use manual entry"}
                            </button>
                        </div>

                        {isManualMode ? (
                            <form
                                onSubmit={handleAddTask}
                                className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end"
                            >
                                <div className="flex-1">
                                    <label
                                        htmlFor="taskName"
                                        className="block text-xs font-semibold uppercase tracking-[0.2rem] text-[#a25327]"
                                    >
                                        Task name
                                    </label>
                                    <input
                                        id="taskName"
                                        type="text"
                                        value={taskName}
                                        onChange={(event) => setTaskName(event.target.value)}
                                        placeholder="Focus block..."
                                        className="mt-1 w-full rounded-[24px] border-2 border-[#f1d4bb] bg-white px-4 py-3 text-base text-[#4b2b18] shadow-[0_4px_0_#f0c7a4] outline-none transition focus:border-[#70c97f] focus:shadow-[0_4px_0_#4a9d59]"
                                    />
                                </div>

                                <div className="w-full max-w-[9rem]">
                                    <label
                                        htmlFor="taskDuration"
                                        className="block text-xs font-semibold uppercase tracking-[0.2rem] text-[#a25327]"
                                    >
                                        Minutes
                                    </label>
                                    <input
                                        id="taskDuration"
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={durationInput}
                                        onChange={(event) => setDurationInput(event.target.value)}
                                        className="mt-1 w-full rounded-[24px] border-2 border-[#f1d4bb] bg-white px-3 py-3 text-center text-base text-[#4b2b18] shadow-[0_4px_0_#f0c7a4] outline-none transition focus:border-[#70c97f] focus:shadow-[0_4px_0_#4a9d59]"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full rounded-[24px] bg-[#33b074] px-6 py-3 text-base font-semibold uppercase tracking-wide text-white shadow-[0_6px_0_#1b7b4c] transition hover:-translate-y-0.5 hover:bg-[#42c482] lg:w-auto"
                                >
                                    Add task
                                </button>
                                {error && (
                                    <p className="text-sm text-[#cc4444]" role="alert">
                                        {error}
                                    </p>
                                )}
                            </form>
                        ) : (
                            <div className="mt-4 rounded-[24px] border-2 border-[#f0ceb0] bg-white/80 p-4 text-[#5a361d] shadow-[0_4px_0_#efc39f]">
                                <label
                                    htmlFor="aiTaskPrompt"
                                    className="text-xs font-semibold uppercase tracking-[0.25rem] text-[#b25a2e]"
                                >
                                    Describe what you need to do
                                </label>
                                <textarea
                                    id="aiTaskPrompt"
                                    value={aiTaskPrompt}
                                    onChange={(event) => setAiTaskPrompt(event.target.value)}
                                    placeholder="e.g. Write release notes for 20 minutes"
                                    rows={3}
                                    className="mt-2 w-full rounded-[20px] border-2 border-[#f1d4bb] bg-white px-4 py-3 text-base text-[#4b2b18] placeholder-[#c49b7f] shadow-[0_4px_0_#f0c7a4] outline-none transition focus:border-[#70c97f] focus:shadow-[0_4px_0_#4a9d59]"
                                />
                                {aiTaskInfo && (
                                    <p className="mt-2 text-sm text-[#3b7a52]">
                                        {aiTaskInfo}
                                    </p>
                                )}
                                {aiTaskError && (
                                    <p className="mt-2 text-sm text-[#c2473d]" role="alert">
                                        {aiTaskError}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={handleCreateTaskFromPrompt}
                                    disabled={isAiTaskLoading}
                                    className="mt-3 w-full rounded-[24px] bg-[#c16a38] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_4px_0_#8f4320] transition hover:-translate-y-0.5 hover:bg-[#d97844] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isAiTaskLoading ? "Thinking..." : "Ask AI to add task"}
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {isWizardComplete && (
                    <>
                        <section className="flex flex-col gap-4 rounded-[32px] border-4 border-[#f3ba92] bg-[#ffe6cf] p-6 text-left shadow-[0_8px_0_#e3a272] sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-[0.35rem] text-[#b26233]">
                                    Bear buddy
                                </p>
                                <p className="text-lg font-semibold text-[#5a2c14]">
                                    {bearStatus.feelingSummary || "No update yet"}
                                </p>
                                <p className="text-sm text-[#7d4a2c]">
                                    {bearStatus.buddyNote || "Send the bear your running tasks for a vibe check."}
                                </p>
                                {bearStatusError && (
                                    <p className="text-sm text-[#c2473d]" role="alert">
                                        {bearStatusError}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col items-start gap-2 sm:items-end">
                                <button
                                    type="button"
                                    onClick={handleCheckBearBuddy}
                                    disabled={isFetchingBear}
                                    className="rounded-[24px] bg-[#33b074] px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_4px_0_#1b7b4c] transition hover:-translate-y-0.5 hover:bg-[#42c482] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isFetchingBear ? "Checking..." : "Check the bear"}
                                </button>
                            </div>
                        </section>

                        <section className="rounded-[32px] border-4 border-[#f6c788] bg-[#fffaf4] p-6 shadow-[0_8px_0_#edba76]">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-[24px] border-2 border-[#f6d7bd] bg-white/80 p-4 text-center">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2rem] text-[#b06638]">
                                        Active timers
                                    </p>
                                    <p className="text-3xl font-bold text-[#442110]">
                                        {tasks.filter((task) => task.isRunning).length}
                                    </p>
                                </div>
                                <div className="rounded-[24px] border-2 border-[#f6d7bd] bg-white/80 p-4 text-center">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2rem] text-[#b06638]">
                                        Total score
                                    </p>
                                    <p className="text-3xl font-bold text-[#442110]">{totalPoints}</p>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-[32px] border-4 border-[#f1caa7] bg-[#fff6ed] p-6 shadow-[0_10px_0_#ebb88f]">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <h2 className="text-xl font-semibold text-[#4c220f]">Tasks ({tasks.length})</h2>
                                <p className="text-xs font-semibold uppercase tracking-[0.3rem] text-[#ca5d30]">
                                    Keep it steady
                                </p>
                            </div>

                            {tasks.length === 0 && (
                                <p className="mt-6 rounded-[24px] border-2 border-dashed border-[#edc59d] bg-[#fff1e0] px-6 py-10 text-center text-sm text-[#8c4a20]">
                                    Add a task above to get started.
                                </p>
                            )}

                            <div className="mt-6 space-y-4">
                                {tasks.map((task) => {
                                    const completionPercent =
                                        task.duration === 0
                                            ? 0
                                            : Math.min(
                                                100,
                                                Math.round(
                                                    ((task.duration - task.remaining) / task.duration) *
                                                    100,
                                                ),
                                            );
                                    const statusLabel = task.isCompleted
                                        ? `Awarded ${task.points} pts`
                                        : task.isRunning
                                            ? "Running"
                                            : "Paused";

                                    return (
                                        <article
                                            key={task.id}
                                            className="rounded-[24px] border-2 border-[#f3d3b6] bg-white p-5 shadow-[0_6px_0_#f0c49f]"
                                        >
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-[#4f230f]">
                                                        {task.title}
                                                    </h3>
                                                    <p className="text-sm text-[#8d5430]">
                                                        {formatTime(task.remaining)} remaining · starts at {formatTime(task.duration)}
                                                    </p>
                                                </div>

                                                <span className="text-xs font-semibold uppercase tracking-[0.2rem] text-[#7c3e26]">
                                                    {statusLabel}
                                                </span>
                                            </div>

                                            <div className="mt-4 h-2 rounded-full bg-[#fee4c9]">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-[#f8b36c] via-[#e27d5a] to-[#63b97a] transition-all"
                                                    style={{ width: `${completionPercent}%` }}
                                                />
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleTimer(task.id)}
                                                    disabled={task.isCompleted || task.remaining <= 0}
                                                    className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wide text-[#4b2b18] shadow-[0_4px_0_#d59b6f] transition ${task.isRunning
                                                        ? "bg-[#f8cf7a] hover:bg-[#f6c05d]"
                                                        : "bg-[#bde687] hover:bg-[#a9da68]"
                                                        } ${task.isCompleted || task.remaining <= 0 ? "cursor-not-allowed opacity-50" : ""
                                                        }`}
                                                >
                                                    {task.isRunning ? "Pause" : "Start"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCompleteTask(task.id)}
                                                    disabled={task.isCompleted || task.remaining <= 0}
                                                    className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wide shadow-[0_4px_0_#d38174] transition ${task.isCompleted || task.remaining <= 0
                                                        ? "cursor-not-allowed bg-[#f5e4d4] text-[#c2a992]"
                                                        : "bg-[#f2a29f] text-[#5f1f1f] hover:bg-[#f38d88]"
                                                        }`}
                                                >
                                                    Complete
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteTask(task.id)}
                                                    className="rounded-full border-2 border-[#e7c5a7] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-[#a4673d] transition hover:border-[#d77a58] hover:text-[#d77a58]"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
