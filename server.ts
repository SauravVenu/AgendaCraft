import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as mammoth from "mammoth";

// Lazy-initialized Gemini client to prevent startup crashes when GEMINI_API_KEY is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment. Please add it via Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limits to support base64 document uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route: Generate Meeting Agenda
  app.post("/api/generate-agenda", async (req, res) => {
    try {
      const { fileBase64, fileName, fileType, textPaste } = req.body;

      let extractedText = "";

      if (fileBase64) {
        const buffer = Buffer.from(fileBase64, "base64");
        // Check if the uploaded file is a docx
        if (
          fileType?.includes("wordprocessingml") ||
          fileType?.includes("docx") ||
          fileName?.endsWith(".docx")
        ) {
          const result = await mammoth.extractRawText({ buffer });
          extractedText = result.value || "";
        } else {
          // Treat as plain text or Markdown
          extractedText = buffer.toString("utf-8");
        }
      } else if (textPaste) {
        extractedText = textPaste;
      }

      const trimmedText = extractedText.trim();
      if (!trimmedText) {
        return res.status(400).json({
          error: "No readable contents found in the uploaded file or text paste. Please provide valid text or a docx/markdown file.",
        });
      }

      // Initialize Gemini Client
      const ai = getGeminiClient();

      // Build Prompt
      const systemInstruction = `You are an expert meeting facilitator and executive assistant. Your goal is to analyze the provided source document (which can be a project overview, client brief, discussion notes, email thread, or report) and craft a highly professional, logical, and structured meeting agenda.

Focus on extracting:
- A relevant and professional title and overall goal for the meeting.
- Highly actionable, logical topics (agenda sections).
- For each section, provide a clear title, a brief summary of context or background from the source document, description of discussions, stakeholders involved, action items or prep decisions, and an appropriate relative weight of time (timeWeight, e.g. 10 to 45) representational of how much discussion that section requires.`;

      const prompt = `Draft a comprehensive meeting agenda based on the following source material content.

Source Material:
------------------------------------------
${trimmedText}
------------------------------------------

Return the structured response strictly using the JSON schema provided. The agenda items must have appropriate relative 'timeWeight' values (e.g. 10, 20, 15, etc.) that sum to progress logically. Use your professional judgement to determine what sections are necessary (such as Intro, specific topic deep-dives, Action Item alignment, and closing wrap-ups). Make sure each section lists real, relevant stakeholders and action items directly derived from the text.`;

      // Try with exponential backoff and fallback models to handle 503/high-demand errors seamlessly
      const modelsToTry = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-3.5-flash"];
      let response: any = null;
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        let attempts = 3;
        let delay = 1000; // start with 1s fallback delay
        
        for (let attempt = 1; attempt <= attempts; attempt++) {
          try {
            console.log(`Attempting agenda generation with model ${modelName} (attempt ${attempt}/${attempts})...`);
            response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    meetingTitle: {
                      type: Type.STRING,
                      description: "Proposed name or title for the meeting.",
                    },
                    meetingGoal: {
                      type: Type.STRING,
                      description: "Overall objective, goal, or target outcome of the meeting.",
                    },
                    agendaItems: {
                      type: Type.ARRAY,
                      description: "Array of logical chronological agenda sections/topics.",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: {
                            type: Type.STRING,
                            description: "A short unique visual ID (e.g., 'sec-1', 'sec-2').",
                          },
                          title: {
                            type: Type.STRING,
                            description: "The name/title of this section, e.g., 'Project Timeline Review'.",
                          },
                          description: {
                            type: Type.STRING,
                            description: "Detail of what is to be covered or debated in this section.",
                          },
                          summary: {
                            type: Type.STRING,
                            description: "A professional summary of the context/background information extracted from the source document explaining WHY this item is on the agenda.",
                          },
                          stakeholders: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Key owners, facilitators, or stakeholders relevant to this section.",
                          },
                          actionItems: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Recommended homework, action items, or decisions to be made during this section.",
                          },
                          timeWeight: {
                            type: Type.NUMBER,
                            description: "Relative importance or weight for time allotment. E.g., minor wrap-up could be 5, deep dive could be 30.",
                          },
                        },
                        required: ["id", "title", "description", "summary", "stakeholders", "actionItems", "timeWeight"],
                      },
                    },
                  },
                  required: ["meetingTitle", "meetingGoal", "agendaItems"],
                },
              },
            });

            if (response && response.text) {
              break; // Success!
            }
          } catch (err: any) {
            lastError = err;
            console.warn(`Attempt ${attempt} with model ${modelName} failed. Error:`, err.message || err);
            
            if (attempt < attempts) {
              await new Promise((resolve) => setTimeout(resolve, delay));
              delay *= 2; // exponential backoff
            }
          }
        }

        if (response && response.text) {
          break; // Exit fallback loop if successful
        }
      }

      if (!response || !response.text) {
        let errorMessage = "All tried models failed to generate a response due to high API demand spikes.";
        if (lastError && lastError.message) {
          errorMessage += ` Details: ${lastError.message}`;
        }
        throw new Error(errorMessage);
      }

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini API.");
      }

      const agendaData = JSON.parse(responseText.trim());
      return res.json({
        success: true,
        data: agendaData,
        extractedLength: trimmedText.length,
      });

    } catch (error: any) {
      console.error("Error generating agenda:", error);
      return res.status(500).json({
        error: error.message || "An unexpected error occurred while processing your request.",
      });
    }
  });

  // Serve static assets and handle Vite in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
