"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

const INITIAL_STATE = {
    status: "idle",
    hungerStrikes: 0,
    happiness: 55,
    history: [],
};

const resolveNotificationPermission = () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
        return "unsupported";
    }
    return Notification.permission;
};

export function useTamagotchiEngine() {
    const [coreState, setCoreState] = useState(INITIAL_STATE);
    const [speech, setSpeech] = useState("Complete a task to feed your panda friend!");
    const [notificationPermission, setNotificationPermission] = useState(
        resolveNotificationPermission,
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
            /* no-op */
        }
    }, []);

    const registerFeed = useCallback((feedEvent) => {
        if (!feedEvent) {
            return;
        }

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
                    const friendlyLine = template.replace(
                        "{task}",
                        feedEvent.taskTitle ?? "that task",
                    );
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
    }, []);

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
