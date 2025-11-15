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

export default function Todo() {
    const [tasks, setTasks] = useState([]);
    const [taskName, setTaskName] = useState("");
    const [durationInput, setDurationInput] = useState("25");
    const [error, setError] = useState("");

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

        if (!taskName.trim()) {
            setError("Give the task a name before adding it.");
            return;
        }

        const parsedMinutes = Number.parseFloat(durationInput);

        if (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
            setError("Duration must be a number greater than 0.");
            return;
        }

        const durationInSeconds = Math.max(5, Math.round(parsedMinutes * 60));
        const newTask = {
            id: Date.now(),
            title: taskName.trim(),
            duration: durationInSeconds,
            remaining: durationInSeconds,
            isRunning: false,
            isCompleted: false,
            points: null,
        };

        setTasks((prev) => [...prev, newTask]);
        setTaskName("");
        setDurationInput("25");
        setError("");
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

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
                <header className="flex flex-col gap-3 text-center sm:text-left">
                    <p className="text-sm font-semibold uppercase tracking-[0.3rem] text-slate-400">
                        Focus Lab
                    </p>
                    <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                        Time-boxed to-do list with instant scoring
                    </h1>
                    <p className="text-base text-slate-300 sm:text-lg">
                        Add tasks with an expected duration, run their timers, pause when
                        needed and mark them complete. Finish with more than 30% of the
                        time left to earn 3 points, otherwise you&apos;ll get 2. Letting
                        the timer run out gives 0 points.
                    </p>
                </header>

                <section className="rounded-2xl bg-white/10 p-6 shadow-2xl backdrop-blur">
                    <form
                        onSubmit={handleAddTask}
                        className="flex flex-col gap-4 lg:flex-row"
                    >
                        <div className="flex-1">
                            <label
                                htmlFor="taskName"
                                className="block text-xs font-semibold uppercase tracking-wide text-slate-300"
                            >
                                Task
                            </label>
                            <input
                                id="taskName"
                                type="text"
                                value={taskName}
                                onChange={(event) => setTaskName(event.target.value)}
                                placeholder="Draft sprint update, fix bug #131…"
                                className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-emerald-400 focus:bg-black/30"
                            />
                        </div>

                        <div className="w-full max-w-[9rem]">
                            <label
                                htmlFor="taskDuration"
                                className="block text-xs font-semibold uppercase tracking-wide text-slate-300"
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
                                className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-3 text-center text-white outline-none transition focus:border-emerald-400 focus:bg-black/30"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-emerald-950 transition hover:bg-emerald-300 lg:w-auto"
                        >
                            Add task
                        </button>
                    </form>
                    {error && (
                        <p className="mt-2 text-sm text-rose-300" role="alert">
                            {error}
                        </p>
                    )}

                    <div className="mt-6 grid gap-4 rounded-xl bg-black/30 p-4 sm:grid-cols-2 sm:gap-6">
                        <div>
                            <p className="text-sm text-slate-400">Active timers</p>
                            <p className="text-3xl font-bold text-white">
                                {tasks.filter((task) => task.isRunning).length}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Total score</p>
                            <p className="text-3xl font-bold text-white">{totalPoints}</p>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-white">
                        Your tasks ({tasks.length})
                    </h2>
                    {tasks.length === 0 && (
                        <p className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-6 py-10 text-center text-slate-300">
                            No tasks yet. Plan your next win above and start the timer.
                        </p>
                    )}

                    <div className="space-y-4">
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
                                    className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg"
                                >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">
                                                {task.title}
                                            </h3>
                                            <p className="text-sm text-slate-400">
                                                {formatTime(task.remaining)} remaining · starts at{" "}
                                                {formatTime(task.duration)}
                                            </p>
                                        </div>

                                        <span className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                                            {statusLabel}
                                        </span>
                                    </div>

                                    <div className="mt-4 h-2 rounded-full bg-white/10">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 transition-all"
                                            style={{ width: `${completionPercent}%` }}
                                        />
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleTimer(task.id)}
                                            disabled={task.isCompleted || task.remaining <= 0}
                                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${task.isRunning
                                                ? "bg-amber-400/90 text-amber-950 hover:bg-amber-300"
                                                : "bg-emerald-400/90 text-emerald-950 hover:bg-emerald-300"
                                                } ${task.isCompleted || task.remaining <= 0 ? "cursor-not-allowed opacity-50" : ""
                                                }`}
                                        >
                                            {task.isRunning ? "Pause" : "Start"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleCompleteTask(task.id)}
                                            disabled={task.isCompleted || task.remaining <= 0}
                                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${task.isCompleted || task.remaining <= 0
                                                ? "cursor-not-allowed bg-white/10 text-white/50"
                                                : "bg-sky-500/80 text-sky-950 hover:bg-sky-400"
                                                }`}
                                        >
                                            Complete
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-rose-400 hover:text-rose-200"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            </div>
        </main>
    );
}
