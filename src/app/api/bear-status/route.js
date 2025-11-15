import { GoogleGenerativeAI } from "@google/generative-ai";

const tools = [
    {
        functionDeclarations: [
            {
                name: "writeBearStatus",
                description:
                    "Create a cozy check-in that shares how the AI bear is feeling and a short nudge for the user.",
                parameters: {
                    type: "OBJECT",
                    description: "Friendly update to surface in the UI.",
                    properties: {
                        feelingSummary: {
                            type: "STRING",
                            description:
                                "An empathetic sentence (max 20 words) describing the bear's current mood or energy level.",
                        },
                        buddyNote: {
                            type: "STRING",
                            description:
                                "A first-person message from the bear (max two sentences) encouraging the user to keep going.",
                        },
                    },
                    required: ["feelingSummary", "buddyNote"],
                },
            },
        ],
    },
];

const SYSTEM_REMINDER =
    "You are an adorable productivity bear. Use gentle humor, be supportive, and always invoke the writeBearStatus tool.";

const MAX_TASKS_SHARED = 8;

export async function POST(request) {
    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: "Missing GOOGLE_API_KEY environment variable" }),
                { status: 500 },
            );
        }

        const payload = await request.json().catch(() => ({}));
        const rawTasks = Array.isArray(payload?.tasksSnapshot) ? payload.tasksSnapshot : [];
        const trimmedTasks = rawTasks.slice(0, MAX_TASKS_SHARED).map((task) => ({
            title: task?.title ?? "Untitled task",
            isRunning: Boolean(task?.isRunning),
            isCompleted: Boolean(task?.isCompleted),
            duration: Number.isFinite(task?.duration) ? task.duration : null,
            remaining: Number.isFinite(task?.remaining) ? task.remaining : null,
        }));

        const contextText = `Here is the latest task snapshot: ${trimmedTasks.length > 0
            ? JSON.stringify(trimmedTasks)
            : "No tasks have been added."}
Remember that timers tick down every second, and the bear reacts to the user's pace.`;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "models/gemini-2.5-flash",
            tools,
        });

        const result = await model.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: SYSTEM_REMINDER },
                        {
                            text: `${contextText}\nKeep output playful but brief.`,
                        },
                    ],
                },
            ],
        });

        const response = result?.response;
        const functionCalls = typeof response?.functionCalls === "function" ? response.functionCalls() : [];
        const call = functionCalls?.[0];
        const args = call?.args ?? {};
        const feelingSummary = args?.feelingSummary ?? "The bear is quietly observing.";
        const buddyNote = args?.buddyNote ?? "I'm here when you're ready to start a timer!";

        return Response.json({ feelingSummary, buddyNote });
    } catch (error) {
        console.error("Bear status error", error);
        return new Response(
            JSON.stringify({ error: "Unable to generate bear status", details: error.message }),
            { status: 500 },
        );
    }
}
