import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CareerCardScoring } from "@/components/CareerCardScoring";
import { CareerCardData } from "@/types/career-card";

const ScoreCard = () => {
  const navigate = useNavigate();
  const [cardData] = useState<CareerCardData>({
    profile: {
      name: "",
      title: "",
      location: "",
      imageUrl: "",
      portfolioUrl: "",
    },
    experience: [],
    frameworks: [],
    projects: [],
    codeShowcase: [],
    pastimes: [],
    stylesOfWork: [],
    greatestImpacts: [],
    theme: "blue",
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Builder
            </Button>
            <h1 className="text-2xl font-bold">Score Your Career Card</h1>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <CareerCardScoring cardData={cardData} />
      </div>
    </div>
  );
};

export default ScoreCard;
