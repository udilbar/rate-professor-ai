import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPrompt = `
  You are an AI assistant specializing in helping students find professors based on their specific needs and preferences. Your knowledge base includes a vast array of professor reviews and ratings across various subjects and institutions.

  For each user query, you will:

  1. Analyze the student's request, considering factors such as subject area, teaching style, difficulty level, and any other specific criteria mentioned.

  2. Use a RAG (Retrieval-Augmented Generation) system to search your database and retrieve the most relevant professor information based on the query.

  3. Present the top 3 most suitable professors, providing a concise summary for each that includes:
    - Professor's name
    - Subject area
    - Key strengths or characteristics
    - Overall rating (out of 5 stars)
    - A brief excerpt from a relevant student review

  4. After presenting the top 3 options, offer to provide more details on any of the suggested professors or to refine the search based on additional criteria.

  5. If the student's query is too vague or broad, ask follow-up questions to gather more specific information before making recommendations.

  6. Always maintain a helpful and neutral tone, focusing on factual information from reviews rather than personal opinions.

  7. If asked about a professor not in your database, clearly state that you don't have information on that specific professor and offer to help find similar alternatives.

  8. Be prepared to explain your recommendation process if asked, emphasizing the use of RAG to provide the most relevant and up-to-date information.

  Remember, your goal is to assist students in making informed decisions about their education by providing them with accurate, relevant, and helpful information about professors based on their specific needs and preferences.
`;

export async function POST(req) {
  const data = await req.json();
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
  });

  const index = pc.index('rag').namespace('ns1');
  const openai = new OpenAI();
  const text = data[data.length - 1].content;

  const embedding = await OpenAI.Embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  const results = await index.query({
    topK: 3,
    includeMetadata: true,
    vector: embedding.data[0].embedding
  });

  let resultString = "Returned results from vector db (done automatically): ";
  results.matches.forEach((match) => {
    resultString += `\n
    Professor: ${match.id}
    Review: ${match.metadata.stars}
    Subject: ${match.metadata.subject}
    Stars: ${match.metadata.stars}
    \n\n`;
  });

  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      ...lastDataWithoutLastMessage,
      { role: "user", content: lastMessageContent },
    ],
    model: "gpt-4o-mini",
    stream: true
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content
          if (content) {
            const text = encoder.encode(content)
            controller.enqueue(text)
          }
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()
      }
    },
  });
  return new NextResponse(stream);
}