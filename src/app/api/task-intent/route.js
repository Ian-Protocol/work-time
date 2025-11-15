import { GoogleGenerativeAI } from "@google/generative-ai";

const tools = [
    {
        functionDeclarations: [
            {
                name: "proposeTasks",
                description:
                    "Transform a user's natural-language productivity request into one or more structured tasks.",
                parameters: {
                    type: "OBJECT",
                    description: "Task metadata for the timer app.",
                    properties: {
                        tasks: {
                            type: "ARRAY",
                            description:
                                "List of 1-4 tasks that should be created. Split separate actions or deliverables into their own entries.",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    title: {
                                        type: "STRING",
                                        description:
                                            "Short task label (2-6 words) derived from the user's request. Keep it Title Case.",
                                    },
                                    durationMinutes: {
                                        type: "NUMBER",
                                        description:
                                            "Positive number of minutes the timer should last. Minimum 1 minute.",
                                    },
                                },
                                required: ["title", "durationMinutes"],
                            },
                        },
                    },
                    required: ["tasks"],
                },
            },
        ],
    },
];

const SYSTEM_PROMPT =
    "You help people plan tasks. Always call the proposeTasks tool with tasks array (1-4 items). Split multiple actions into separate tasks, infer reasonable durations, and keep titles in Title Case.";
const MAX_TASKS_RETURNED = 4;

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
        const rawPrompt = payload?.prompt;
        const prompt = typeof rawPrompt === "string" ? rawPrompt.trim() : "";

        if (!prompt) {
            return new Response(
                JSON.stringify({ error: "Please share a sentence that describes your task." }),
                { status: 400 },
            );
        }

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
                        { text: SYSTEM_PROMPT },
                        {
                            text: `User request: ${prompt}\nRespond briefly and always call createTask.`,
                        },
                    ],
                },
            ],
        });

        const response = result?.response;
        const functionCalls = typeof response?.functionCalls === "function" ? response.functionCalls() : [];
        const call = functionCalls?.[0];
        const args = call?.args ?? {};

        const rawTasks = Array.isArray(args?.tasks) ? args.tasks : [];
        const cleanedTasks = rawTasks
            .slice(0, MAX_TASKS_RETURNED)
            .map((task) => ({
                title: typeof task?.title === "string" ? task.title.trim() : "",
                durationMinutes: Number(task?.durationMinutes),
            }))
            .filter(
                (task) => task.title && Number.isFinite(task.durationMinutes) && task.durationMinutes > 0,
            );

        // Backwards compatibility in case the model still replies with a single title/duration pair.
        if (cleanedTasks.length === 0) {
            const singleTitle = typeof args?.title === "string" ? args.title.trim() : "";
            const singleDuration = Number(args?.durationMinutes);
            if (singleTitle && Number.isFinite(singleDuration) && singleDuration > 0) {
                cleanedTasks.push({ title: singleTitle, durationMinutes: singleDuration });
            }
        }

        if (cleanedTasks.length === 0) {
            return new Response(
                JSON.stringify({ error: "The assistant could not understand that task. Try rephrasing." }),
                { status: 422 },
            );
        }

        return Response.json({ tasks: cleanedTasks });
    } catch (error) {
        console.error("Task intent error", error);
        return new Response(
            JSON.stringify({ error: "Unable to interpret that task", details: error.message }),
            { status: 500 },
        );
    }
}
