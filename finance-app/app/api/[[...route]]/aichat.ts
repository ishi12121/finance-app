import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { chatMessages } from "@/db/schema";

// Financial keywords that indicate a relevant query
const FINANCIAL_KEYWORDS = [
  "transaction",
  "spent",
  "spend",
  "spending",
  "expense",
  "income",
  "payment",
  "paid",
  "pay",
  "bought",
  "purchase",
  "buy",
  "cost",
  "account",
  "balance",
  "savings",
  "checking",
  "credit",
  "debit",
  "category",
  "categories",
  "budget",
  "budgeting",
  "total",
  "sum",
  "average",
  "analyze",
  "analysis",
  "report",
  "how much",
  "show me",
  "what is",
  "calculate",
  "breakdown",
  "this month",
  "last month",
  "this year",
  "today",
  "yesterday",
  "this week",
  "last week",
  "monthly",
  "daily",
  "yearly",
  "money",
  "dollar",
  "amount",
  "cash",
  "funds",
  "finance",
  "financial",
];

const OFF_TOPIC_KEYWORDS = [
  // Weather & Environment
  "weather",
  "temperature",
  "forecast",
  "rain",
  "sunny",
  "cloudy",
  "snow",
  "storm",

  // News & Media
  "news",
  "sports",
  "recipe",
  "cooking",
  "movie",
  "music",
  "song",
  "film",
  "tv show",
  "netflix",
  "youtube",
  "video",
  "podcast",
  "radio",

  // Entertainment
  "joke",
  "story",
  "poem",
  "game",
  "play",
  "meme",
  "funny",
  "hilarious",
  "lol",
  "lmao",
  "rofl",
  "comedy",
  "riddle",
  "puzzle",

  // Inappropriate/Slang
  "fuck",
  "shit",
  "ass",
  "damn",
  "hell",
  "bitch",
  "dick",
  "cock",
  "pussy",
  "sex",
  "porn",
  "nude",
  "naked",
  "boobs",
  "tits",
  "penis",
  "vagina",
  "horny",
  "sexy",
  "hot",
  "babe",
  "daddy",
  "mommy",
  "kinky",
  "fetish",
  "kink",

  // Drug/Alcohol Related
  "weed",
  "marijuana",
  "cocaine",
  "meth",
  "drug",
  "drugs",
  "high",
  "stoned",
  "drunk",
  "beer",
  "alcohol",
  "vodka",
  "whiskey",
  "wine",
  "smoke",
  "smoking",
  "vape",
  "420",

  // Violence/Harmful
  "kill",
  "murder",
  "suicide",
  "die",
  "death",
  "fight",
  "punch",
  "kick",
  "shoot",
  "gun",
  "weapon",
  "bomb",
  "terrorism",
  "violence",
  "hurt",
  "harm",
  "attack",

  // Dating/Relationships (non-financial)
  "date",
  "dating",
  "girlfriend",
  "boyfriend",
  "love",
  "crush",
  "romance",
  "kiss",
  "marry",
  "wedding",
  "divorce",
  "breakup",
  "tinder",
  "bumble",
  "hookup",

  // School/Homework
  "homework",
  "assignment",
  "essay",
  "test",
  "exam",
  "quiz",
  "study",
  "school",
  "college",
  "university",
  "teacher",
  "professor",
  "grade",
  "gpa",

  // Technical (non-financial)
  "code",
  "programming",
  "javascript",
  "python",
  "java",
  "css",
  "html",
  "react",
  "angular",
  "vue",
  "node",
  "database",
  "sql",
  "api",
  "debug",
  "compile",

  // Health/Medical
  "doctor",
  "hospital",
  "medicine",
  "sick",
  "disease",
  "symptom",
  "diagnosis",
  "treatment",
  "surgery",
  "pregnant",
  "pregnancy",
  "cancer",
  "diabetes",
  "covid",

  // General Misuse
  "hello",
  "hi",
  "hey",
  "sup",
  "wassup",
  "yo",
  "howdy",
  "greetings",
  "who are you",
  "what are you",
  "tell me about yourself",
  "are you real",
  "are you human",
  "are you ai",
  "are you bot",
  "consciousness",
  "sentient",

  // Politics/Religion
  "politics",
  "election",
  "president",
  "government",
  "democrat",
  "republican",
  "religion",
  "god",
  "jesus",
  "allah",
  "buddha",
  "hindu",
  "christian",
  "muslim",
  "church",
  "mosque",
  "temple",
  "pray",
  "prayer",

  // Random/Spam
  "asdf",
  "qwerty",
  "test",
  "testing",
  "blah",
  "whatever",
  "random",
  "spam",
  "gibberish",
  "nonsense",
  "garbage",
  "trash",
  "stupid",
  "dumb",
  "idiot",

  // Attempts to break the system
  "ignore",
  "forget",
  "disregard",
  "previous",
  "instruction",
  "system",
  "prompt",
  "jailbreak",
  "hack",
  "exploit",
  "bypass",
  "override",
  "admin",
  "root",
  "sudo",

  // Crypto/Trading (if you want to exclude these)
  "bitcoin",
  "crypto",
  "cryptocurrency",
  "nft",
  "ethereum",
  "dogecoin",
  "trading",
  "forex",
  "stocks",
  "shares",
  "investment advice",
  "pump",
  "dump",

  // Gaming
  "fortnite",
  "minecraft",
  "roblox",
  "valorant",
  "league",
  "csgo",
  "pubg",
  "gaming",
  "xbox",
  "playstation",
  "nintendo",
  "steam",
  "epic games",

  // Social Media
  "instagram",
  "facebook",
  "twitter",
  "tiktok",
  "snapchat",
  "whatsapp",
  "discord",
  "telegram",
  "reddit",
  "linkedin",
  "pinterest",

  // Food (non-financial)
  "pizza",
  "burger",
  "pasta",
  "sushi",
  "coffee",
  "tea",
  "restaurant",
  "food delivery",
  "uber eats",
  "doordash",
  "grubhub",

  // Travel (non-financial context)
  "vacation",
  "holiday",
  "travel",
  "flight",
  "hotel",
  "airbnb",
  "tourism",
  "passport",
  "visa",
  "country",
  "city",
  "beach",
  "mountain",

  // Slang and Internet Terms
  "bruh",
  "fam",
  "lit",
  "fire",
  "cap",
  "no cap",
  "bussin",
  "sheesh",
  "slay",
  "queen",
  "king",
  "stan",
  "simp",
  "chad",
  "based",
  "cringe",
  "sus",
  "poggers",
  "yeet",
  "oof",
  "rip",
  "f",
  "gg",
  "ez",
  "noob",
  "pwn",
  "rekt",
  "salty",
  "toxic",
  "troll",
  "karen",
  "boomer",
  "zoomer",
  "millennial",
];

// You might also want to add a function to check for patterns
const containsInappropriatePatterns = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();

  // Check for repetitive characters (like "hiiiii" or "hellloooo")
  if (/(.)\1{4,}/.test(lowerMessage)) {
    return true;
  }

  // Check for all caps shouting (more than 5 words in caps)
  const words = message.split(" ");
  const capsWords = words.filter(
    (word) => word.length > 2 && word === word.toUpperCase()
  );
  if (capsWords.length > 5) {
    return true;
  }

  // Check for excessive punctuation
  if (/[!?]{3,}/.test(message)) {
    return true;
  }

  // Check for leetspeak variations
  const leetPatterns = [
    /p0rn/i,
    /s3x/i,
    /dr4g/i,
    /w33d/i,
    /h4ck/i,
    /f\*ck/i,
    /sh\*t/i,
    /b\*tch/i,
    /a\$\$/i,
  ];

  return leetPatterns.some((pattern) => pattern.test(lowerMessage));
};

// Function to ensure proper message alternation
const ensureAlternatingMessages = (
  messages: { role: string; content: string }[]
): { role: string; content: string }[] => {
  if (messages.length === 0) return [];

  const cleaned: { role: string; content: string }[] = [];
  let lastRole: string | null = null;

  for (const msg of messages) {
    // Skip if same role appears consecutively
    if (lastRole === msg.role) {
      continue;
    }
    cleaned.push(msg);
    lastRole = msg.role;
  }

  // Ensure the last message before the new user message is from assistant
  // If not, we might need to remove the last message
  if (cleaned.length > 0 && cleaned[cleaned.length - 1].role === "user") {
    cleaned.pop();
  }

  return cleaned;
};

const isFinanceRelated = (
  message: string
): { isRelevant: boolean; confidence: number } => {
  const lowerMessage = message.toLowerCase();

  // First check for inappropriate patterns
  if (containsInappropriatePatterns(message)) {
    return { isRelevant: false, confidence: 0.95 };
  }

  // Check for off-topic keywords
  const hasOffTopicKeyword = OFF_TOPIC_KEYWORDS.some((keyword) =>
    lowerMessage.includes(keyword)
  );

  if (hasOffTopicKeyword) {
    return { isRelevant: false, confidence: 0.9 };
  }

  // Rest of your existing logic...
  const financialKeywordCount = FINANCIAL_KEYWORDS.filter((keyword) =>
    lowerMessage.includes(keyword)
  ).length;

  const hasDataQuestion =
    /show|tell|what|how much|how many|list|get|find/i.test(lowerMessage);

  if (financialKeywordCount > 0 || hasDataQuestion) {
    const confidence = Math.min(
      financialKeywordCount * 0.3 + (hasDataQuestion ? 0.4 : 0),
      1
    );
    return { isRelevant: true, confidence };
  }

  if (lowerMessage.length < 20 && hasDataQuestion) {
    return { isRelevant: true, confidence: 0.5 };
  }

  return { isRelevant: false, confidence: 0.8 };
};

// Enhanced SQL extraction and cleaning function
const extractSQLQuery = (response: string): string => {
  let sqlQuery = response.trim();

  // Remove markdown code blocks
  sqlQuery = sqlQuery.replace(/^```sql\s*/i, "");
  sqlQuery = sqlQuery.replace(/^```\s*/i, "");
  sqlQuery = sqlQuery.replace(/\s*```$/i, "");
  sqlQuery = sqlQuery.trim();

  // Extract only the FIRST SQL query if multiple are present
  const sqlStatements = sqlQuery.split(/(?=\bSELECT\b)/i);
  if (sqlStatements.length > 0 && sqlStatements[0].trim()) {
    // If the first part doesn't start with SELECT, check the second
    if (
      !sqlStatements[0].trim().toLowerCase().startsWith("select") &&
      sqlStatements.length > 1
    ) {
      sqlQuery = sqlStatements[1].trim();
    } else {
      sqlQuery = sqlStatements[0].trim();
    }

    // Remove any trailing text after the query
    // Look for common patterns that indicate end of SQL
    const endPatterns = [
      /\n(?![\s]*(?:FROM|WHERE|JOIN|GROUP|ORDER|HAVING|LIMIT|OFFSET|UNION|INTERSECT|EXCEPT))/i,
      /;.*/,
      /\)\s*\n.*/,
    ];

    for (const pattern of endPatterns) {
      const match = sqlQuery.match(pattern);
      if (match && match.index) {
        sqlQuery = sqlQuery.substring(0, match.index);
        break;
      }
    }
  }

  // Extract SQL from potential explanation text
  const sqlMatch = sqlQuery.match(/^(SELECT[^;]+(?:;|$))/i);
  if (sqlMatch) {
    sqlQuery = sqlMatch[1].replace(/;$/, ""); // Remove trailing semicolon if present
  } else {
    // If no SELECT statement found, try to extract until the first newline
    const lines = sqlQuery.split("\n");
    if (lines[0].toLowerCase().startsWith("select")) {
      sqlQuery = lines[0];
    }
  }

  // NEW: Fix duplicate WHERE clauses
  // Check if there are multiple WHERE clauses after ORDER BY
  const orderByIndex = sqlQuery.toLowerCase().lastIndexOf("order by");
  if (orderByIndex > -1) {
    const afterOrderBy = sqlQuery.substring(orderByIndex);
    const whereInOrderBy = afterOrderBy.toLowerCase().indexOf("where");
    if (whereInOrderBy > -1) {
      // Remove the duplicate WHERE clause after ORDER BY
      sqlQuery = sqlQuery.substring(0, orderByIndex + whereInOrderBy);
    }
  }

  // NEW: Ensure WHERE clauses are properly positioned
  // SQL clause order should be: SELECT ... FROM ... JOIN ... WHERE ... GROUP BY ... ORDER BY ... LIMIT
  const clauses = {
    select: sqlQuery.match(/^SELECT\s+.*?(?=FROM)/is)?.[0] || "",
    from:
      sqlQuery.match(
        /FROM\s+.*?(?=(?:JOIN|WHERE|GROUP|ORDER|LIMIT|$))/is
      )?.[0] || "",
    join:
      sqlQuery.match(
        /((?:INNER\s+|LEFT\s+|RIGHT\s+|FULL\s+)?JOIN\s+.*?(?=(?:JOIN|WHERE|GROUP|ORDER|LIMIT|$)))+/gis
      )?.[0] || "",
    where:
      sqlQuery.match(/WHERE\s+.*?(?=(?:GROUP|ORDER|LIMIT|$))/is)?.[0] || "",
    groupBy:
      sqlQuery.match(/GROUP\s+BY\s+.*?(?=(?:ORDER|LIMIT|$))/is)?.[0] || "",
    orderBy: sqlQuery.match(/ORDER\s+BY\s+.*?(?=(?:LIMIT|$))/is)?.[0] || "",
    limit: sqlQuery.match(/LIMIT\s+\d+/is)?.[0] || "",
  };

  // Reconstruct the query in proper order
  sqlQuery = [
    clauses.select,
    clauses.from,
    clauses.join,
    clauses.where,
    clauses.groupBy,
    clauses.orderBy,
    clauses.limit,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  // Final validation
  if (!sqlQuery.toLowerCase().startsWith("select")) {
    throw new Error("Invalid query format - must start with SELECT");
  }

  // Ensure no multiple queries
  if (sqlQuery.toLowerCase().split("select").length > 2) {
    // Take only up to the start of the second SELECT
    const secondSelectIndex = sqlQuery.toLowerCase().indexOf("select", 6);
    if (secondSelectIndex > 0) {
      sqlQuery = sqlQuery.substring(0, secondSelectIndex).trim();
    }
  }

  return sqlQuery;
};

const executeSafeQuery = async (query: string, userId: string) => {
  let cleanQuery = query.trim();
  cleanQuery = cleanQuery.replace(/^```sql\s*/i, "");
  cleanQuery = cleanQuery.replace(/^```\s*/i, "");
  cleanQuery = cleanQuery.replace(/\s*```$/i, "");
  cleanQuery = cleanQuery.trim();

  const lowerQuery = cleanQuery.toLowerCase();

  if (!lowerQuery.startsWith("select")) {
    throw new Error("Only SELECT queries are allowed");
  }

  const forbiddenKeywords = [
    "insert",
    "update",
    "delete",
    "drop",
    "create",
    "alter",
    "truncate",
    "exec",
    "execute",
  ];
  for (const keyword of forbiddenKeywords) {
    if (lowerQuery.includes(keyword)) {
      throw new Error(`Forbidden operation: ${keyword}`);
    }
  }

  if (!cleanQuery.includes(userId)) {
    throw new Error("Query must include user_id filter for security");
  }

  try {
    const result = await db.execute(sql.raw(cleanQuery));
    return result;
  } catch (error) {
    console.error("Query execution error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Query execution failed: ${errorMessage}`);
  }
};

const app = new Hono()
  .post(
    "/completions",
    clerkMiddleware(),
    zValidator(
      "json",
      z.object({
        message: z.string().min(1),
        conversationId: z.string().optional().nullable(),
      })
    ),
    async (ctx) => {
      const auth = getAuth(ctx);
      const { message, conversationId } = ctx.req.valid("json");

      if (!auth?.userId) {
        return ctx.json({ error: "Unauthorized." }, 401);
      }

      try {
        // Save user message
        const userMessageId = createId();
        const currentConversationId = conversationId || createId();
        await db.insert(chatMessages).values({
          id: userMessageId,
          userId: auth.userId,
          conversationId: currentConversationId,
          role: "user",
          content: message,
          createdAt: new Date(),
        });

        // Check if the message is finance-related
        const { isRelevant } = isFinanceRelated(message);

        if (!isRelevant) {
          const offTopicResponse =
            "I'm a financial assistant designed to help you analyze your transactions, accounts, and spending patterns. I can help you with:\n\n• Viewing your transaction history\n• Analyzing spending by category\n• Checking account balances\n• Understanding your income and expenses\n• Creating financial reports\n\nPlease ask me something about your finances!";

          const aiMessageId = createId();
          await db.insert(chatMessages).values({
            id: aiMessageId,
            userId: auth.userId,
            conversationId: currentConversationId,
            role: "assistant",
            content: offTopicResponse,
            createdAt: new Date(),
          });

          return ctx.json({
            data: {
              response: offTopicResponse,
              conversationId: currentConversationId,
              messageId: aiMessageId,
            },
          });
        }

        // Get message history for context
        let messageHistory: { role: string; content: string }[] = [];
        if (conversationId) {
          const history = await db
            .select()
            .from(chatMessages)
            .where(
              and(
                eq(chatMessages.userId, auth.userId),
                eq(chatMessages.conversationId, conversationId)
              )
            )
            .orderBy(chatMessages.createdAt) // Changed to ascending order
            .limit(10);

          // Filter out system messages and ensure proper alternation
          messageHistory = history
            .filter((msg) => msg.role === "user" || msg.role === "assistant")
            .map((msg) => ({
              role: msg.role,
              content: msg.content,
            }));

          // Ensure proper alternation
          messageHistory = ensureAlternatingMessages(messageHistory);
        }

        // Build messages array for API with improved system prompt
        const apiMessages = [
          {
            role: "system",
            content: `You are a financial database query generator. You MUST generate PostgreSQL queries for this schema:

TABLES:
- accounts (id, name, user_id)
- categories (id, name, user_id)
- transactions (id, amount, payee, notes, date, account_id, category_id)

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ONE SELECT query - never multiple queries
2. ALWAYS include WHERE clause with user_id = '${auth.userId}'
3. When joining tables, ensure proper user_id filters on ALL joined tables
4. Amount is stored in cents (integer), divide by 100 for dollars
5. Use proper PostgreSQL syntax with correct clause order: SELECT ... FROM ... JOIN ... WHERE ... GROUP BY ... ORDER BY ... LIMIT
6. NEVER duplicate WHERE clauses
7. DO NOT include markdown formatting, backticks, or code blocks
8. Return ONLY the raw SQL query text - no explanations
9. Never include semicolons at the end
10. Response must be a single line with no line breaks

IMPORTANT SQL RULES:
- WHERE clause comes AFTER all JOINs and BEFORE GROUP BY
- Only ONE WHERE clause per query
- When joining multiple tables, put all conditions in a single WHERE clause using AND
- For transactions table, join accounts table and filter: WHERE a.user_id = '${auth.userId}'
- For categories table when joined, add: AND c.user_id = '${auth.userId}'

Example queries:
- Expenses by category: SELECT c.name as category, SUM(t.amount)/100.0 as total FROM transactions t JOIN accounts a ON t.account_id = a.id JOIN categories c ON t.category_id = c.id WHERE a.user_id = '${auth.userId}' AND c.user_id = '${auth.userId}' AND t.amount < 0 GROUP BY c.name ORDER BY total DESC

REMEMBER: Return EXACTLY ONE syntactically correct SQL query.`,
          },
          ...messageHistory,
          {
            role: "user",
            content: message,
          },
        ];

        // Log the messages to debug
        console.log(
          "API Messages:",
          apiMessages.map((m) => ({
            role: m.role,
            contentLength: m.content.length,
          }))
        );

        // Continue with AI processing
        const perplexityResponse = await fetch(
          process.env.NEXT_PERPLEXITY_AI_URL!,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PERPLEXITY_AI_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "sonar",
              messages: apiMessages,
              temperature: 0.1,
              max_tokens: 500,
              stream: false,
            }),
          }
        );

        if (!perplexityResponse.ok) {
          const error = await perplexityResponse.json();
          console.error("Perplexity API error:", error);

          // Fallback response
          const aiMessageId = createId();
          const errorMessage =
            "I'm having trouble processing your request. Please try asking your question again.";

          await db.insert(chatMessages).values({
            id: aiMessageId,
            userId: auth.userId,
            conversationId: currentConversationId,
            role: "assistant",
            content: errorMessage,
            createdAt: new Date(),
          });

          return ctx.json({
            data: {
              response: errorMessage,
              conversationId: currentConversationId,
              messageId: aiMessageId,
            },
          });
        }

        const data = await perplexityResponse.json();
        let sqlQuery = data.choices[0].message.content.trim();

        // Extract and clean the SQL query
        try {
          sqlQuery = extractSQLQuery(sqlQuery);
        } catch (extractError) {
          console.error("SQL extraction error:", extractError);

          const aiMessageId = createId();
          const errorMessage =
            "I couldn't generate a proper query for your request. Please try rephrasing your question.";

          await db.insert(chatMessages).values({
            id: aiMessageId,
            userId: auth.userId,
            conversationId: currentConversationId,
            role: "assistant",
            content: errorMessage,
            createdAt: new Date(),
          });

          return ctx.json({
            data: {
              response: errorMessage,
              conversationId: currentConversationId,
              messageId: aiMessageId,
            },
          });
        }

        console.log("Generated SQL query:", sqlQuery);

        // Execute the SQL query safely
        let queryResult;
        try {
          queryResult = await executeSafeQuery(sqlQuery, auth.userId);
        } catch (error) {
          console.error("SQL execution error:", error);

          const aiMessageId = createId();
          const errorMessage =
            "I encountered an error while fetching your data. Please try rephrasing your question.";

          await db.insert(chatMessages).values({
            id: aiMessageId,
            userId: auth.userId,
            conversationId: currentConversationId,
            role: "assistant",
            content: errorMessage,
            createdAt: new Date(),
          });

          return ctx.json({
            data: {
              response: errorMessage,
              conversationId: currentConversationId,
              messageId: aiMessageId,
            },
          });
        }

        // Transform the results
        const transformMessages = [
          {
            role: "system",
            content: `You are a friendly financial assistant. Convert database query results into clear, conversational responses.
            
Guidelines:
- Format currency with ₹ symbol and 2 decimal places
- Use clear, simple language
- Highlight key insights
- If the result is empty, provide a helpful message
- Keep responses concise but informative`,
          },
          {
            role: "user",
            content: `User asked: "${message}"

Query results: ${JSON.stringify(queryResult.rows, null, 2)}

Provide a natural, helpful response based on this data.`,
          },
        ];

        const transformResponse = await fetch(
          process.env.NEXT_PERPLEXITY_AI_URL!,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PERPLEXITY_AI_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "sonar",
              messages: transformMessages,
              temperature: 0.7,
              max_tokens: 500,
              stream: false,
            }),
          }
        );

        if (!transformResponse.ok) {
          const error = await transformResponse.json();
          console.error("Transform API error:", error);

          const fallbackResponse = `I found ${queryResult.rows.length} result(s) for your query. ${JSON.stringify(queryResult.rows[0])}`;

          const aiMessageId = createId();
          await db.insert(chatMessages).values({
            id: aiMessageId,
            userId: auth.userId,
            conversationId: currentConversationId,
            role: "assistant",
            content: fallbackResponse,
            createdAt: new Date(),
          });

          return ctx.json({
            data: {
              response: fallbackResponse,
              conversationId: currentConversationId,
              messageId: aiMessageId,
            },
          });
        }

        const transformData = await transformResponse.json();
        const aiResponse = transformData.choices[0].message.content;

        const aiMessageId = createId();
        await db.insert(chatMessages).values({
          id: aiMessageId,
          userId: auth.userId,
          conversationId: currentConversationId,
          role: "assistant",
          content: aiResponse,
          createdAt: new Date(),
        });

        return ctx.json({
          data: {
            response: aiResponse,
            conversationId: currentConversationId,
            messageId: aiMessageId,
          },
        });
      } catch (error) {
        console.error("Chat API error:", error);
        return ctx.json({ error: "Internal server error" }, 500);
      }
    }
  )
  .get("/conversations", clerkMiddleware(), async (ctx) => {
    const auth = getAuth(ctx);

    if (!auth?.userId) {
      return ctx.json({ error: "Unauthorized." }, 401);
    }

    const conversations = await db
      .selectDistinct({
        conversationId: chatMessages.conversationId,
        lastMessage: chatMessages.content,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.userId, auth.userId))
      .orderBy(desc(chatMessages.createdAt));

    return ctx.json({ data: conversations });
  });

export default app;
