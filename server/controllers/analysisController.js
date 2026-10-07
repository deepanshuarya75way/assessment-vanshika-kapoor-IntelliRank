import Analysis from '../models/Analysis.js';
import { scrapeUrl } from '../services/scraperService.js';
import { analyzeSeoData } from '../services/geminiService.js'; // 1. Fixed: Added missing import


//reusable seo analysis workflow
export const runSeoAnalysis=async(userId,url)=>{
   try{
     let validUrl;
    try {
                validUrl = new URL(url.startsWith('http') ? url : `http://${url}`);
        
    } catch (error) {
                return{success: false, message: 'Invalid URL format' }
    }
        
    const analysis = await Analysis.create({userId: req.userId, url: validUrl.href, status: 'processing'});
    
    const scrapeResult=await scrapeUrl(validUrl.href)

                if(!scrapeResult.success){
                    analysis.status="failed";
                    await analysis.save();
                    return{
                        success:fail,
                        error:scrapeResult.error || "website scraping failed"
                    };
                }
                    //AI SEO Analysis
                     const aiResult = await analyzeSeoData({
                        ...scrapeResult.data,
                        url:validUrl.href,
                        loadTime:scrapeResult.loadTime,
                        statusCode:scrapeResult.statusCode,
                        pageSize:scrapeResult.pageSize,
                        wordCount:scrapeResult.data.wordCount
                    }); 

                if (!aiResult.success) {
                    analysis.status = "failed";
                    await analysis.save();
                    return{
                        success:false,
                        error:aiResult.error || "AI analysis failed"
                    };
                }

                //Step 3:Save  AI Results
                analysis.overallScore = aiResult.data.overallScore || 0;
                analysis.categories = aiResult.data.categories || {};
                analysis.keywords = aiResult.data.keywords || [];
                analysis.issues = aiResult.data.issues || [];

                // Direct scraper mappings (Jo mongoose schema demand karta hai)
                analysis.metaData = scrapeResult.data.metaData || {};
                analysis.headings = scrapeResult.data.headings || {};
                analysis.links = scrapeResult.data.links || {} ;
                analysis.images = scrapeResult.data.images || {};
                analysis.wordCount = scrapeResult.data.wordCount || 0;
                
                // Extra metrics aur execution status
                analysis.loadTime = scrapeResult.data.loadTime || 0;
                analysis.pageSize = scrapeResult.data.pageSize || 0;
                analysis.status = "completed";

                // Finally database mein update commit karo
                await analysis.save();

                return{
                    success:true,
                    analysis
                };
    }       catch(error){
        console.error("runSeoAnalysis error: ",error)
        return{
            success:false,
            error:error.message,
        }
    }

}


//Analyse a URL
export const analyzeUrl = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({success: false, message: 'URL is required' });
        }
            //Valid URL format
            let validUrl;
            try {
                validUrl = new URL(url.startsWith('http') ? url : `http://${url}`);
            } catch (error) {
                return res.status(400).json({success: false, message: 'Invalid URL format' });
            }

            //Create analysis record with pending status
             const analysis = await Analysis.create({userId: req.userId, url: validUrl.href, status: 'processing'});
             
             //Send immediate response with analysis ID
                res.json({success: true, message: 'Analysis started', analysisId: analysis._id});

            //Run Scrapping and analysis in the background
            runSeoAnalysis(req.userId,validUrl.href)
            .then(async(result)=>{
                if(!result.success){
                    console.error("Background Analysis error:",result.error);
                    
                }
            }).catch((error)=>{
                console.error("Background analysis error:",error);
            });
        }catch(error){
        console.error("Analyze URL error:",error.message);
        if(!res.headersSent){
            res.status(500).json({succes:false,message:"Server error"})
        }
    }

}

//Get analysis by ID
export const getAnalysis= async (req, res) => {
    try {
        const analysis = await Analysis.findOne({ _id: req.params.id, userId: req.userId });

        if (!analysis) {
            return res.status(404).json({ success: false, message: 'Analysis not found or unauthorized' });
        }

        res.json({ success: true, analysis });

    } catch (error) {
        console.error("Get analysis error:",error.message);
        res.status(500).json({ success: false, message: "Server error" });
        
    }
}

//Get all analysis for a user
export const getAnalyses = async (req, res) => {
    try {
        const page=parseInt(req.query.page) || 1;
        const limit=parseInt(req.query.limit) || 10;
        const skip=(page-1)*limit;

        const analyses = await Analysis.find({ userId: req.userId }).sort({createdAt:-1}).skip(skip).limit(limit).select
        ("-issues -keywords");

        const total =await Analysis.countDocuments({userId:req.userId})

        res.json({ success: true, analyses,pagination:{page,limit,total,pages:Math.ceil(total/limit)} });
        
    } catch (error) {
        console.error("Get analyses error:",error.message);
        res.status(500).json({ success: false, message: "Server error" });
        
    }
}

//Delete analysis 
export const deleteAnalysis = async (req, res) => {
        try {
        await Analysis.findOneAndDelete({ _id: req.params.id, userId: req.userId });


        res.json({ success: true, message:"Analysis deleted" });

    } catch (error) {
        console.error("Delete analysis error:",error.message);
        res.status(500).json({ success: false, message: "Server error" });
        
    }

}
