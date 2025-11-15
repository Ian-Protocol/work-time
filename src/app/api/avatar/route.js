import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";

const MOODS = [
    { id: "happy", tone: "joyful", extra: "a big bright smile" },
    { id: "curious", tone: "curious", extra: "a playful head tilt" },
    { id: "sad", tone: "melancholy", extra: "a tiny pout" },
];

const SPRITE_PROMPT_TEMPLATE =
    "Pixel art portrait, 8-bit sprite of {{DESCRIPTION}}. Expression: {{TONE}} with {{EXTRA}}. Output as a PNG with a fully transparent background, centered, crisp edges, ready to overlay UI.";
const BACKDROP_PROMPT_TEMPLATE =
    "Wide 8-bit pixel art backdrop inspired by {{DESCRIPTION}}. Cozy minimal environment, layered parallax feel, gentle gradients, absolutely no characters or silhouettes.";

const VISION_MODEL = "gemini-2.5-flash";
const IMAGEN_MODEL = "imagen-4.0-generate-001";
const MAX_FILE_BYTES = 8 * 1024 * 1024;

const getSpritePrompt = (description, mood) =>
    SPRITE_PROMPT_TEMPLATE.replace("{{DESCRIPTION}}", description)
        .replace("{{TONE}}", mood.tone)
        .replace("{{EXTRA}}", mood.extra);

async function describePhoto(genAI, base64Data, mimeType) {
    const model = genAI.getGenerativeModel({ model: VISION_MODEL });
    const response = await model.generateContent({
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: "Describe the main subject in this image in 25 words. Include species/breed, visible colors, and accessories. Use third person descriptive language.",
                    },
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType ?? "image/jpeg",
                        },
                    },
                ],
            },
        ],
    });

    return response?.response?.text()?.trim() || "a cheerful companion";
}

async function generateSprite(imagenClient, prompt) {
    const result = await imagenClient.models.generateImages({
        model: IMAGEN_MODEL,
        prompt,
        config: {
            numberOfImages: 1,
            aspectRatio: "1:1",
        },
    });

    const imageBytes = result?.generatedImages?.[0]?.image?.imageBytes;
    if (!imageBytes) {
        throw new Error("Imagen did not return an image.");
    }

    return `data:image/png;base64,${imageBytes}`;
}

async function generateBackground(imagenClient, description) {
    const prompt = BACKDROP_PROMPT_TEMPLATE.replace("{{DESCRIPTION}}", description);
    const result = await imagenClient.models.generateImages({
        model: IMAGEN_MODEL,
        prompt,
        config: {
            numberOfImages: 1,
            aspectRatio: "16:9",
        },
    });

    const imageBytes = result?.generatedImages?.[0]?.image?.imageBytes;
    if (!imageBytes) {
        throw new Error("Imagen did not return a background image.");
    }

    return `data:image/png;base64,${imageBytes}`;
}

export async function POST(request) {
    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: "Missing GOOGLE_API_KEY environment variable" }),
                { status: 500 },
            );
        }

        const formData = await request.formData();
        const photo = formData.get("photo");

        if (!photo || typeof photo === "string") {
            return new Response(JSON.stringify({ error: "Please upload an image file." }), {
                status: 400,
            });
        }

        if (photo.size > MAX_FILE_BYTES) {
            return new Response(
                JSON.stringify({ error: "Image is too large. Pick something under 8 MB." }),
                { status: 413 },
            );
        }

        if (!photo.type?.startsWith("image/")) {
            return new Response(
                JSON.stringify({ error: "Unsupported file type. Upload a PNG or JPEG." }),
                { status: 415 },
            );
        }

        const buffer = Buffer.from(await photo.arrayBuffer());
        const base64Data = buffer.toString("base64");

        const genAI = new GoogleGenerativeAI(apiKey);
        const imagenClient = new GoogleGenAI({ apiKey });

        const description = await describePhoto(genAI, base64Data, photo.type);

        const sprites = {};
        for (const mood of MOODS) {
            const prompt = getSpritePrompt(description, mood);
            const sprite = await generateSprite(imagenClient, prompt);
            sprites[mood.id] = sprite;
        }

        const background = await generateBackground(imagenClient, description);

        return Response.json({ sprites, background, description });
    } catch (error) {
        console.error("Avatar sprite generation failed", error);
        return new Response(
            JSON.stringify({ error: "Unable to create the sprite right now." }),
            { status: 500 },
        );
    }
}
