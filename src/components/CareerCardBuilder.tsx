import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Eye, Edit3, Link, Check, Loader2 } from "lucide-react";
import { cardApi } from "@/lib/api";
import { ProfileSection } from "./sections/ProfileSection";
import { ExperienceSection } from "./sections/ExperienceSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { GreatestImpactsSection } from "./sections/GreatestImpactsSection";
import { StylesOfWorkSection } from "./sections/StylesOfWorkSection";
import { FrameworksSection } from "./sections/FrameworksSection";
import { PastimesSection } from "./sections/PastimesSection";
import { CodeShowcaseSection } from "./sections/CodeShowcaseSection";
import { CareerCardPreview } from "./CareerCardPreview";
import { ImportDataSection } from "./ImportDataSection";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { careerCardDataSchema, logger } from "@/lib/validation";
import { useAuth } from "@/context/AuthContext";
import { CareerCardData } from "@/types/career-card";
import { useNavigate } from "react-router-dom";

interface CareerCardBuilderProps {
  cardId: string;
}

const CareerCardBuilder = ({ cardId }: CareerCardBuilderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string>(cardId);
  const [isLoadingCard, setIsLoadingCard] = useState(true);
  const [forceExpandPreview, setForceExpandPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [cardData, setCardData] = useState<CareerCardData>({
    profile: {
      name: "",
      title: "",
      location: "",
      imageUrl: "",
      portfolioUrl: "",
    },
    theme: 'blue',
    experience: [],
    projects: [],
    greatestImpacts: [],
    stylesOfWork: [],
    frameworks: [],
    pastimes: [],
    codeShowcase: [],
  });

  const lockedName = useMemo(() => {
    if (!user) return "";
    return `${user.firstName} ${user.lastName}`.trim();
  }, [user]);

  useEffect(() => {
    setActiveCardId(cardId);
  }, [cardId]);

  useEffect(() => {
    if (!user || !cardId) return;
    setIsLoadingCard(true);
    const loadCard = async () => {
      try {
        const existing = await cardApi.fetchCard(cardId);
        if (existing?.cardData) {
          setCardData(existing.cardData as CareerCardData);
          setActiveCardId(existing.id);
        }
      } catch (error) {
        logger.error('Failed to load saved card', error);
        toast.error('Unable to load this career card.');
      } finally {
        setIsLoadingCard(false);
      }
    };

    loadCard();
  }, [user, cardId]);

  useEffect(() => {
    if (!lockedName) return;
    setCardData(prev => {
      if (prev.profile.name === lockedName) {
        return prev;
      }
      return {
        ...prev,
        profile: {
          ...prev.profile,
          name: lockedName,
        },
      };
    });
  }, [lockedName]);

  const handleShareCard = async () => {
    try {
      setIsSharing(true);
      toast.loading("Generating shareable link...");

      // Validate card data before saving
      const validationResult = careerCardDataSchema.safeParse(cardData);
      
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast.error(`Validation failed: ${firstError.message} at ${firstError.path.join('.')}`);
        logger.error('Validation errors:', validationResult.error.errors);
        setIsSharing(false);
        return;
      }

      // Save or update the card data
      let cardIdentifier = activeCardId;
      
      if (cardIdentifier) {
        await cardApi.updateCard(cardIdentifier, validationResult.data as CareerCardData);
      } else {
        const created = await cardApi.createCard(validationResult.data as CareerCardData);
        cardIdentifier = created.id;
        setActiveCardId(created.id);
      }

      // Copy link to clipboard
      const shareUrl = `${window.location.origin}/card/${cardIdentifier}`;
      await navigator.clipboard.writeText(shareUrl);
      
      setLinkCopied(true);
      toast.success("Link copied to clipboard!");
      
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (error) {
      logger.error("Share error:", error);
      toast.error("Failed to generate shareable link. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  const wait = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

  const ensurePreviewReady = async () => {
    if (!showPreview) {
      setShowPreview(true);
      toast.info("Switching to preview mode...");
      await wait(400);
    }

    setForceExpandPreview(true);
    await wait(150);

    if (!previewRef.current) {
      await wait(150);
    }

    return Boolean(previewRef.current);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const ready = await ensurePreviewReady();
      if (!ready || !previewRef.current) {
        toast.error("Preview not ready yet. Please try again.");
        return;
      }

      toast.loading("Generating your career card PDF...");

      // Capture the preview card as canvas
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: "#ffffff",
        scale: 1.2, // Balanced quality and file size
        logging: false,
        useCORS: true,
      });

      // A4 dimensions
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.85); // JPEG with 85% quality for smaller file size
      
      // If content fits on one page, add it directly
      if (imgHeight <= pdfHeight) {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      } else {
        // Split content across multiple pages
        let heightLeft = imgHeight;
        let position = 0;
        
        // Add first page
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
        
        // Add remaining pages
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
      }
      
      // Download PDF
      pdf.save(`${cardData.profile.name || "career-card"}_${new Date().getTime()}.pdf`);
      
      toast.success("Career card PDF downloaded successfully!");
    } catch (error) {
      logger.error("Export error:", error);
      toast.error("Failed to export career card. Please try again.");
    } finally {
      setIsExporting(false);
      setForceExpandPreview(false);
    }
  };

  const updateProfile = (profile: CareerCardData["profile"]) => {
    setCardData({ ...cardData, profile });
  };

  const updateExperience = (experience: CareerCardData["experience"]) => {
    setCardData({ ...cardData, experience });
  };

  const updateProjects = (projects: CareerCardData["projects"]) => {
    setCardData({ ...cardData, projects });
  };

  const updateGreatestImpacts = (greatestImpacts: CareerCardData["greatestImpacts"]) => {
    setCardData({ ...cardData, greatestImpacts });
  };

  const updateStylesOfWork = (stylesOfWork: CareerCardData["stylesOfWork"]) => {
    setCardData({ ...cardData, stylesOfWork });
  };

  const updateFrameworks = (frameworks: CareerCardData["frameworks"]) => {
    setCardData({ ...cardData, frameworks });
  };

  const updatePastimes = (pastimes: CareerCardData["pastimes"]) => {
    setCardData({ ...cardData, pastimes });
  };

  const updateCodeShowcase = (codeShowcase: CareerCardData["codeShowcase"]) => {
    setCardData({ ...cardData, codeShowcase });
  };

  const handleImportedData = (importedData: any) => {
    const newCardData = { ...cardData };

    // Update profile if available
    if (importedData.profile) {
      newCardData.profile = {
        ...newCardData.profile,
        ...importedData.profile,
      };
    }
    if (lockedName) {
      newCardData.profile = {
        ...newCardData.profile,
        name: lockedName,
      };
    }
    if (lockedName) {
      newCardData.profile = {
        ...newCardData.profile,
        name: lockedName,
      };
    }

    // Update experience if available
    if (importedData.experience && Array.isArray(importedData.experience)) {
      newCardData.experience = [...newCardData.experience, ...importedData.experience];
    }

    // Update projects if available
    if (importedData.projects && Array.isArray(importedData.projects)) {
      newCardData.projects = [...newCardData.projects, ...importedData.projects];
    }

    // Update greatestImpacts if available
    if (importedData.greatestImpacts && Array.isArray(importedData.greatestImpacts)) {
      newCardData.greatestImpacts = [...newCardData.greatestImpacts, ...importedData.greatestImpacts];
    }

    // Update codeShowcase if available
    if (importedData.codeShowcase && Array.isArray(importedData.codeShowcase)) {
      newCardData.codeShowcase = [...newCardData.codeShowcase, ...importedData.codeShowcase];
    }

    setCardData(newCardData);
    toast.success("Data imported successfully!");
  };

  if (!user) {
    return null;
  }

  if (isLoadingCard) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--editor-bg))]">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-left"
          >
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Career Card Builder
            </h1>
            <p className="text-sm text-muted-foreground">Create your comprehensive career profile</p>
          </button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2"
            >
              {showPreview ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? "Edit" : "Preview"}
            </Button>
            <Button onClick={handleShareCard} className="gap-2" disabled={isSharing}>
              {linkCopied ? <Check className="h-4 w-4" /> : <Link className="h-4 w-4" />}
              {isSharing ? "Generating..." : linkCopied ? "Link Copied!" : "Share Card"}
            </Button>
            <Button onClick={handleExport} variant="outline" className="gap-2" disabled={isExporting}>
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export PDF"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {showPreview ? (
          <div ref={previewRef}>
            <CareerCardPreview data={cardData} forceExpand={forceExpandPreview} />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Directions Section */}
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <h2 className="text-xl font-semibold mb-3">
                How to Build Your Career Card
              </h2>
              <div className="space-y-2 text-muted-foreground">
                <p className="flex items-start gap-2">
                  <span className="text-primary font-semibold mt-0.5">•</span>
                  <span><strong>Fill what showcases you best</strong> - You don't need to complete every section. Focus on the areas that highlight your unique strengths and experiences.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary font-semibold mt-0.5">•</span>
                  <span><strong>No word limits</strong> - Write as much or as little as you need. This is your story to tell.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary font-semibold mt-0.5">•</span>
                  <span><strong>Import your resume</strong> - Use the Import section below to auto-populate from your existing resume or portfolio.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary font-semibold mt-0.5">•</span>
                  <span><strong>Preview & Export</strong> - Click Preview to see your card, then Export to download it as an image.</span>
                </p>
              </div>
            </Card>
            
            <ImportDataSection onDataImported={handleImportedData} />
            
            <ProfileSection
              data={cardData.profile}
              onChange={updateProfile}
              theme={cardData.theme}
              onThemeChange={(theme) => setCardData({ ...cardData, theme })}
              nameLocked
            />
            <ExperienceSection data={cardData.experience} onChange={updateExperience} />
            <ProjectsSection data={cardData.projects} onChange={updateProjects} />
            <GreatestImpactsSection data={cardData.greatestImpacts} onChange={updateGreatestImpacts} />
            <StylesOfWorkSection data={cardData.stylesOfWork} onChange={updateStylesOfWork} />
            <FrameworksSection data={cardData.frameworks} onChange={updateFrameworks} />
            <PastimesSection data={cardData.pastimes} onChange={updatePastimes} />
            <CodeShowcaseSection data={cardData.codeShowcase} onChange={updateCodeShowcase} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CareerCardBuilder;
