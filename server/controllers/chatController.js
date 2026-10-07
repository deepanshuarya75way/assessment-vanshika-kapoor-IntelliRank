import Analysis from "../models/Analysis.js";
import Chat from "../models/chatModel.js";
import { askSeoAssistant } from "../services/chatService.js";
import { runSeoAnalysis } from "./analysisController.js";

export const chatWithSeoAssistant = async (req, res) => {
  try {
    const { analysisId,websiteUrl, message } = req.body;

    if (!analysisId || !message) {
      return res.status(400).json({
        success: false,
        message: "AnalysisId and message required",
      });
    }

    let analysis=null;
    if(analysisId){
      analysis = await Analysis.findOne({
      _id: analysisId,
      userId: req.userId,
    });
    }else if(websiteUrl){

      //check if user analysis id already exists
      analysis=await Analysis.findOne({
      userId: req.userId,
      url:websiteUrl,
      status:"completed"
    }).sort({createdAt:-1});

    //if no analysis
    if(!analysis){
      const result=await runSeoAnalysis(
        req.userId,
        websiteUrl
      );

      if(!result.success){
        return res.status(500).json({
          success:false,
          message:result.error
        });
      }
      analysis=result.analysis;
    }
    }
     

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: "Analysis not found",
      });
    }

    //use url stored in the analysis as the trusted url
    const url=analysis.url || websiteUrl;

    if(!url){
      return res.status(400).json({
        success:false,
        message:"website url not avalable"
      })
    }
    
    // Find existing chat
    let chat = await Chat.findOne({
      analysisId,
      userId: req.userId,
    });

    if (!chat) {
      chat = await Chat.create({
        analysisId,
        userId: req.userId,
        messages: [],
      });
    } 

    //keep previos messages separately
      const previousMessages=[...chat.messages];

    

    // Ask Gemini
    const result = await askSeoAssistant(
      analysis,
      url,
      message,
      previousMessages
    );

     if (!result.success) {
      return res.status(500).json(result);
    }

    // Save user message
    chat.messages.push({
      role: "user",
      content: message,
    });

   

    // Save AI reply
    chat.messages.push({
      role: "assistant",
      content: result.answer,
    });

    await chat.save();

    res.json({
      success: true,
      answer: result.answer,
    });

  } catch (err) {
    console.error("chat error:",err);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getChatHistory = async (req, res) => {
  try {
//         console.log("Request received");
// console.log("analysisId:", req.params.analysisId);
// console.log("userId:", req.userId);

    const chat = await Chat.findOne({
      analysisId: req.params.analysisId,
      userId: req.userId,
    });

    if (!chat) {
      return res.json({
        success: true,
        messages: [],
      });
    }

    res.json({
      success: true,
      messages: chat.messages,
    });
  } catch (err) {
    console.error("chat history:",err);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};