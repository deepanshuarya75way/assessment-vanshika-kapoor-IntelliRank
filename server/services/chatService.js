import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

export const askSeoAssistant = async (analysis,websiteUrl,message,previousMessages = [] ) => {
        try {

const history = previousMessages
  .map(
    (msg) => `${msg.role.toUpperCase()}: ${msg.content}`
  )
  .join("\n");

const prompt = `
You are IntelliRank AI, a professional SEO consultant.

The authenticated user's website is:

Website Url:${websiteUrl}

You must use the provided Seo analysis as a primary source of truth.

Website SEO Analysis

Overall Score: ${analysis.overallScore}

SEO Score: ${analysis.categories.seo}

Performance: ${analysis.categories.performance}

Accessibility: ${analysis.categories.accessibility}

Best Practices: ${analysis.categories.bestPractices}

Meta Title:
${analysis.metaData.title}

Meta Description:
${analysis.metaData.description}

SEO Issues:
${analysis.issues
  .map(
    (i) => `
Severity: ${i.severity}
Category: ${i.category}
Issue: ${i.message}
Recommendation: ${i.recommendation}
`
  )
  .join("\n")}

Previous Conversation:
${history || "No previous conversations"}

Current User Question:
${message}

Instructions:

- Answer only SEO related questions.
-Use the provided webiste url when referring to the user's website
-Use the existing seo analysis and scores when giving recomendations
-Do not invent SEO scores,issues,website information.
-If the answer is already available in the analysis explain it clearly
- Use previous conversation when relevant.
- Keep answers concise.
- Use markdown.
- Use bullet points whenever possible.
- If the user asks unrelated questions, politely say you only help with SEO.
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        return {
            success:true,
            answer:response.text
        }

    } catch(err){

        return{
            success:false,
            error:err.message
        }

    }
}