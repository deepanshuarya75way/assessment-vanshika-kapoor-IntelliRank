import { useState,useEffect } from "react";
import type { ChatMessage } from "../types/chat";
import { useApp } from "../context/AppContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  analysisId?: string;
  websiteUrl?:string
}

const SeoChat = ({ analysisId,websiteUrl }: Props) => {
  const { api } = useApp();

const [messages, setMessages] = useState<ChatMessage[]>([]);


  const [loading, setLoading] = useState(false);
    const [input, setInput] = useState("");
const [analysisSummary,setAnalysisSummary]=useState<{
  score:number;
  recommendations:{
    issue:string,
    recommendation:string
  }[];
}|null>(null);


  const suggestedQuestions = [
  "Why is my SEO score low?",
  "Explain all critical issues.",
  "Give me a 7-day SEO improvement plan.",
  "Which issue should I fix first?",
];

  useEffect(() => {
  const loadChat = async () => {
    try {
      const res = await api.get(`/api/chat/${analysisId}`);

      if (
        res.data.success &&
        res.data.messages.length > 0
      ) {
        setMessages(
          res.data.messages.map((msg: any) => ({
            role: msg.role,
            message: msg.content,
          }))
        );
      }
      else {
  setMessages([
    {
      role: "assistant",
      message:
        "👋 Hi! I am your AI SEO Assistant.\nAsk me anything about this SEO report.",
    },
  ]);
}
    } catch (err) {
      console.error(err);
    }
  };

  loadChat();
}, [analysisId]);

  const sendMessage = async (text?:string) => {
    const messageText=text??input;
    if (!messageText.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      message: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);

    setInput("")
    setLoading(true);

    try {
      const res = await api.post("/api/chat", {
        analysisId,
        websiteUrl,
        message: input,
      });
       

      if(res.data.score!== undefined){
        setAnalysisSummary({
          score:res.data.score,
          recommendations:res.data.recommendations || [],
        })
      }
      if(res.data.success){
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          message: res.data.answer,
        },
      ]);
    }else{
      setMessages((prev)=>[
        ...prev,
        {
          role:"assistant",
          message:"failed to get ai response",
        }
      ])
    }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          message: "❌ Something went wrong.",
        },
      ]);
    }
    finally{
    setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mt-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          🤖 AI SEO Assistant
        </h3>

        <span className="text-sm text-muted-foreground">
          Powered by Gemini
        </span>
      </div>
{messages.length === 1 && (
  <div className="mb-5">
    <p className="text-sm text-muted-foreground mb-3">
      💡 Try asking:
    </p>

    <div className="flex flex-wrap gap-2">
      {suggestedQuestions.map((q) => (
        <button
          key={q}
onClick={() => {
  setInput(q);

  setTimeout(() => {
    sendMessage();
  }, 100);
}}         
 className="px-3 py-2 rounded-full border border-border bg-background hover:bg-muted transition text-sm"
        >
          {q}
        </button>
      ))}
    </div>
  </div>
)}


      {/* Chat Messages */}
      <div className="h-[420px] overflow-y-auto border border-border rounded-xl bg-background p-4 space-y-4">
       
       {analysisSummary && (
        <div>
           <div>
             <div>
              <p>
                  Website            <p>{websiteUrl}</p>
              </p>
             </div>

             <p>{analysisSummary.score}</p>
           </div>

           {analysisSummary.recommendations?.length>0 && (
            <div >  
              <p>Recommendations</p> 
              {analysisSummary.recommendations.slice(0,3).map((item,i)=>(
                <p>
                  {item.recommendation}
                </p>
              ))} </div>       )}
        </div>
       )}
 
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.role === "user"
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`max-w-[75%] px-5 py-4 rounded-2xl shadow-md leading-7 ${
                msg.role === "user"
                ? "bg-zinc-600 text-white ml-auto"
               : "bg-zinc-800 text-white"
              }`}
            >
<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {msg.message}
</ReactMarkdown>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">

              <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]"></div>
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]"></div>

            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-3 mt-4">

        <input
          type="text"
          value={input}
          placeholder="Ask anything about this SEO report..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
        />

        <button
          onClick={()=>sendMessage()}
          disabled={loading || !input.trim()}
          className="bg-zinc-800 text-white px-6 rounded-xl hover:opacity-90 transition disabled:opacity-50"
        >
          Send
        </button>

      </div>
    </div>
  );
};

export default SeoChat;