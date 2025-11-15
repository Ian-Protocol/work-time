"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STATUS_MAP = {
    idle: {
        label: "Waiting for snacks",
        accent: "from-slate-800 to-slate-900",
        badge: "bg-slate-500/30 text-slate-200",
        aura: "bg-slate-600/30",
    },
    content: {
        label: "Well fed",
        accent: "from-emerald-700 to-emerald-900",
        badge: "bg-emerald-400/20 text-emerald-200",
        aura: "bg-emerald-500/30",
    },
    ecstatic: {
        label: "Euphoric",
        accent: "from-violet-600 to-indigo-900",
        badge: "bg-indigo-400/20 text-indigo-100",
        aura: "bg-indigo-400/40",
    },
    hungry: {
        label: "Hungry",
        accent: "from-amber-700 to-amber-900",
        badge: "bg-amber-400/20 text-amber-100",
        aura: "bg-amber-500/30",
    },
    hurt: {
        label: "Hurt",
        accent: "from-rose-700 to-rose-900",
        badge: "bg-rose-500/30 text-rose-100",
        aura: "bg-rose-500/30",
    },
    critical: {
        label: "Critical",
        accent: "from-red-800 to-red-950",
        badge: "bg-red-500/30 text-red-100",
        aura: "bg-red-500/30",
    },
    dead: {
        label: "RIP",
        accent: "from-slate-900 to-black",
        badge: "bg-slate-700/60 text-slate-300",
        aura: "bg-slate-700/60",
    },
};

const POSITIVE_LINES = [
    "Yum! {task} was tasty!",
    "Thanks for finishing {task}!",
    "Mmm, productivity snacks taste best.",
    "Chewing on {task} made me giddy!",
];

const HUNGER_LINES = {
    hungry: "Uh oh… timers ran out. I’m getting hungry.",
    hurt: "Missing snacks hurts. Please finish something soon!",
    critical: "I’m fading fast. Another zero might finish me.",
    dead: "I starved… adopt a new one by refreshing.",
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatTime = (timestamp) => {
    if (!timestamp) return "moments ago";
    try {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "moments ago";
    }
};

const PandaSprite = ({ status }) => {
    const faceColor = status === "dead" ? "#94a3b8" : "#f8fafc";
    const accentColor = status === "dead" ? "#475569" : "#020617";
    const mouthPath =
        status === "hungry" || status === "hurt"
            ? "M45 78 Q60 65 75 78"
            : status === "dead"
                ? "M50 78 Q60 72 70 78"
                : "M40 75 Q60 90 80 75";

    const leftEye =
        status === "critical" || status === "dead"
            ? "M50 60 l-6 10"
            : "M44 60 q6 10 12 0";
    const rightEye =
        status === "critical" || status === "dead"
            ? "M74 60 l6 10"
            : "M68 60 q6 10 12 0";

    return (
        <svg
            viewBox="0 0 120 140"
            role="img"
            aria-label="Tiny tamagotchi panda"
            className="h-28 w-28"
        >
            <circle cx="35" cy="30" r="18" fill={accentColor} />
            <circle cx="85" cy="30" r="18" fill={accentColor} />
            <ellipse cx="60" cy="62" rx="45" ry="40" fill={faceColor} />
            <ellipse cx="60" cy="110" rx="38" ry="28" fill={faceColor} />
            <circle cx="40" cy="62" r="11" fill={accentColor} />
            <circle cx="80" cy="62" r="11" fill={accentColor} />
            <ellipse cx="60" cy="82" rx="10" ry="6" fill="#0f172a" opacity="0.1" />
            <path d={leftEye} stroke="#020617" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d={rightEye} stroke="#020617" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path
                d={mouthPath}
                stroke="#020617"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
            />
            {status === "ecstatic" && (
                <>
                    <circle cx="25" cy="90" r="6" fill="#38bdf8" opacity="0.7" />
                    <circle cx="95" cy="90" r="6" fill="#f472b6" opacity="0.7" />
                </>
            )}
        </svg>
    );
};

const TAMAGOTCHI_INITIAL = {
    status: "idle",
    hungerStrikes: 0,
    happiness: 55,
    history: [],
};

const resolveInitialNotificationPermission = () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
        return "unsupported";
    }
    return Notification.permission;
};

export function useTamagotchiEngine() {
    const [coreState, setCoreState] = useState(TAMAGOTCHI_INITIAL);
    const [speech, setSpeech] = useState("Complete a task to feed your panda friend!");
    const [notificationPermission, setNotificationPermission] = useState(
        resolveInitialNotificationPermission,
    );
    const speechTimerRef = useRef(null);
    const pendingEffectRef = useRef(null);

    useEffect(
        () => () => {
            if (speechTimerRef.current) {
                clearTimeout(speechTimerRef.current);
            }
        },
        [],
    );

    useEffect(() => {
        if (notificationPermission !== "default") {
            return;
        }
        if (typeof window === "undefined" || !("Notification" in window)) {
            return;
        }
        Notification.requestPermission().then((permission) => {
            setNotificationPermission(permission);
        });
    }, [notificationPermission]);

    const speak = useCallback((text, duration = 5500) => {
        if (!text) return;
        setSpeech(text);
        if (speechTimerRef.current) {
            clearTimeout(speechTimerRef.current);
        }
        speechTimerRef.current = setTimeout(() => {
            setSpeech(null);
        }, duration);
    }, []);

    const showNotification = useCallback((title, body) => {
        if (typeof window === "undefined" || !("Notification" in window)) {
            return;
        }
        if (Notification.permission !== "granted") {
            return;
        }
        try {
            new Notification(title, { body });
        } catch {
            /* noop */
        }
    }, []);

    const registerFeed = useCallback(
        (feedEvent) => {
            if (!feedEvent) return;

            setCoreState((prev) => {
                let speechConfig = null;
                let notificationConfig = null;

                const nextHistory = [
                    {
                        id: feedEvent.eventId,
                        taskTitle: feedEvent.taskTitle ?? "Unnamed task",
                        points: feedEvent.points,
                        awardedAt: feedEvent.awardedAt,
                    },
                    ...prev.history,
                ].slice(0, 5);

                let nextState;

                if (feedEvent.points <= 0) {
                    const nextHunger = Math.min(prev.hungerStrikes + 1, 4);
                    const nextStatus =
                        nextHunger >= 4
                            ? "dead"
                            : nextHunger === 3
                                ? "critical"
                                : nextHunger === 2
                                    ? "hurt"
                                    : "hungry";
                    const message = HUNGER_LINES[nextStatus] ?? HUNGER_LINES.hungry;
                    speechConfig = {
                        text: message,
                        duration: nextStatus === "dead" ? 8000 : 6500,
                    };
                    notificationConfig = {
                        title: nextStatus === "dead" ? "Tamagotchi has died" : "Tamagotchi is starving",
                        body: message,
                    };

                    nextState = {
                        ...prev,
                        history: nextHistory,
                        hungerStrikes: nextHunger,
                        happiness: clamp(prev.happiness - 25, 0, 100),
                        status: nextStatus,
                    };
                } else {
                    const revived = prev.status === "dead";
                    const nextStatus = revived
                        ? "content"
                        : feedEvent.points >= 3
                            ? "ecstatic"
                            : "content";

                    if (revived) {
                        const line = "A miracle snack! I'm back from the void!";
                        speechConfig = { text: line, duration: 7000 };
                        notificationConfig = { title: "Tamagotchi revived", body: line };
                    } else {
                        const template =
                            POSITIVE_LINES[Math.floor(Math.random() * POSITIVE_LINES.length)] ??
                            POSITIVE_LINES[0];
                        const friendlyLine = template.replace("{task}", feedEvent.taskTitle ?? "that task");
                        speechConfig = { text: friendlyLine, duration: 5000 };
                    }

                    nextState = {
                        ...prev,
                        history: nextHistory,
                        hungerStrikes: 0,
                        happiness: clamp(prev.happiness + feedEvent.points * 9, 0, 100),
                        status: nextStatus,
                    };
                }

                pendingEffectRef.current = {
                    speechConfig,
                    notificationConfig,
                };

                return nextState;
            });
        },
        [],
    );

    useEffect(() => {
        const pending = pendingEffectRef.current;
        if (!pending) {
            return;
        }
        pendingEffectRef.current = null;

        if (pending.speechConfig) {
            speak(pending.speechConfig.text, pending.speechConfig.duration);
        }
        if (pending.notificationConfig) {
            showNotification(pending.notificationConfig.title, pending.notificationConfig.body);
        }
    }, [coreState, showNotification, speak]);

    return [
        {
            status: coreState.status,
            happiness: coreState.happiness,
            speech,
            history: coreState.history,
            notificationPermission,
        },
        registerFeed,
    ];
}

export default function TamagotchiPlayground({ state, totalPoints }) {
    const {
        status = "idle",
        happiness = 55,
        speech = null,
        history = [],
        notificationPermission = "default",
    } = state ?? {};

    const statusInfo = STATUS_MAP[status] ?? STATUS_MAP.idle;
    const happinessPercent = useMemo(() => Math.round(clamp(happiness, 0, 100)), [happiness]);
    const latestHistory = history[0];

    return (
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/90 to-slate-900/80 p-6 shadow-2xl shadow-emerald-900/20">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.4rem] text-slate-400">
                            Tamagotchi playground
                        </span>
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusInfo.badge}`}
                        >
                            {statusInfo.label}
                        </span>
                    </div>
                    <p className="text-base text-slate-300">
                        Finish tasks with time to spare to keep the panda bouncing. When timers hit
                        zero, it starves and eventually fades away.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl bg-white/5 p-4">
                            <p className="text-sm text-slate-400">Happiness</p>
                            <p className="text-3xl font-bold text-white">{happinessPercent}%</p>
                            <div className="mt-2 h-2 rounded-full bg-white/10">
                                <div
                                    className={`h-full rounded-full bg-gradient-to-r ${statusInfo.accent}`}
                                    style={{ width: `${happinessPercent}%` }}
                                />
                            </div>
                        </div>
                        <div className="rounded-2xl bg-white/5 p-4">
                            <p className="text-sm text-slate-400">Total points</p>
                            <p className="text-3xl font-bold text-white">{totalPoints}</p>
                            <p className="text-xs text-slate-400">
                                Feed earned across every completed task.
                            </p>
                        </div>
                        <div className="rounded-2xl bg-white/5 p-4">
                            <p className="text-sm text-slate-400">Notifications</p>
                            <p className="text-lg font-semibold text-white">
                                {notificationPermission === "granted"
                                    ? "Enabled"
                                    : notificationPermission === "unsupported"
                                        ? "Unavailable"
                                        : "Pending"}
                            </p>
                            <p className="text-xs text-slate-400">
                                Alerts fire when it gets hungry or starts dying.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="w-full rounded-2xl bg-white/5 p-4 sm:w-72">
                    <p className="text-sm font-semibold text-slate-200">Recent snacks</p>
                    <div className="mt-3 space-y-3">
                        {history.length === 0 ? (
                            <p className="text-sm text-slate-400">
                                No snacks yet. Complete a task to feed it.
                            </p>
                        ) : (
                            history.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="flex items-center justify-between text-sm text-slate-100"
                                >
                                    <div className="flex-1 pr-3">
                                        <p className="truncate font-semibold">{entry.taskTitle}</p>
                                        <p className="text-xs text-slate-400">
                                            {formatTime(entry.awardedAt)}
                                        </p>
                                    </div>
                                    <span
                                        className={`text-base font-bold ${entry.points > 0 ? "text-emerald-300" : "text-rose-300"
                                            }`}
                                    >
                                        {entry.points > 0 ? `+${entry.points}` : "0"}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="relative mt-6 h-60 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
                {speech && (
                    <div className="tamagotchi-speech pointer-events-none absolute right-8 top-6 w-full max-w-sm rounded-2xl bg-white/90 p-4 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20">
                        {speech}
                    </div>
                )}

                <div className="absolute inset-x-10 bottom-8 h-1 rounded-full bg-white/10" />
                <div className="absolute inset-x-8 bottom-6">
                    <div className="tamagotchi-track">
                        <div className="tamagotchi-avatar">
                            <div className={`tamagotchi-shadow ${statusInfo.aura}`} />
                            <div className="tamagotchi-sprite flex items-center justify-center rounded-full bg-white/10 p-4 backdrop-blur">
                                <PandaSprite status={status} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {latestHistory && (
                <p className="mt-4 text-sm text-slate-400">
                    Last snack: <span className="text-slate-100">{latestHistory.taskTitle}</span>{" "}
                    ({latestHistory.points > 0 ? `+${latestHistory.points} pts` : "0 pts"} ·{" "}
                    {formatTime(latestHistory.awardedAt)})
                </p>
            )}
        </section>
    );
}

