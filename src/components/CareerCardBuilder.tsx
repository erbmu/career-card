import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Eye, Edit3, Loader2, Save } from "lucide-react";
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
import { formatDistanceToNow } from "date-fns";

interface CareerCardBuilderProps {
  cardId: string;
}

const CareerCardBuilder = ({ cardId }: CareerCardBuilderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string>(cardId);
  const [isLoadingCard, setIsLoadingCard] = useState(true);
  const [forceExpandPreview, setForceExpandPreview] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const persistCard = useCallback(
    async (data: CareerCardData, options: { silent?: boolean } = {}) => {
      if (!activeCardId) return false;

      const validationResult = careerCardDataSchema.safeParse(data);
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        if (options.silent) {
          logger.warn("Validation failed during auto-save", validationResult.error.errors);
        } else {
          toast.error(`Validation failed: ${firstError.message} at ${firstError.path.join(".")}`);
        }
        return false;
      }

      try {
        setIsSaving(true);
        await cardApi.updateCard(activeCardId, validationResult.data as CareerCardData);
        const now = new Date();
        setLastSavedAt(now);
        if (!options.silent) {
          toast.success("Changes saved");
        }
        return true;
      } catch (error) {
        logger.error("Save error:", error);
        if (!options.silent) {
          toast.error("Failed to save changes. Please try again.");
        }
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [activeCardId]
  );

  useEffect(() => {
    if (!user || !cardId) return;
    setIsLoadingCard(true);
    setHasLoadedInitialData(false);
    const loadCard = async () => {
      try {
        const existing = await cardApi.fetchCard(cardId);
        if (existing?.cardData) {
          setCardData(existing.cardData as CareerCardData);
          setActiveCardId(existing.id);
          if (existing.updatedAt) {
            setLastSavedAt(new Date(existing.updatedAt));
          }
        }
      } catch (error) {
        logger.error('Failed to load saved card', error);
        toast.error('Unable to load this career card.');
      } finally {
        setIsLoadingCard(false);
        setHasLoadedInitialData(true);
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

  useEffect(() => {
    if (!hasLoadedInitialData || !activeCardId) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      persistCard(cardData, { silent: true });
    }, 1200);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [cardData, hasLoadedInitialData, activeCardId, persistCard]);

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

  const handleSaveNow = async () => {
    if (!hasLoadedInitialData || !activeCardId) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    await persistCard(cardData);
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
        scale: 1.5,
        logging: false,
        useCORS: true,
      });

      const pxToMm = (px: number) => (px * 25.4) / 96;
      const pageWidth = Math.max(pxToMm(canvas.width), 50);
      const pageHeight = Math.max(pxToMm(canvas.height), 50);
      const orientation = pageWidth > pageHeight ? "landscape" : "portrait";

      // Create PDF sized exactly to the card so it fills the page
      const pdf = new jsPDF({
        orientation,
        unit: "mm",
        format: [pageWidth, pageHeight],
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
      
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="text-left"
          >
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Career Card Builder
            </h1>
            <p className="text-sm text-muted-foreground">Create your comprehensive career profile</p>
          </button>
          <div className="flex items-end gap-4 flex-wrap justify-end">
            <div className="text-xs text-muted-foreground min-w-[140px] text-right">
              {isSaving ? (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </span>
              ) : lastSavedAt ? (
                <>Saved {formatDistanceToNow(lastSavedAt, { addSuffix: true })}</>
              ) : (
                "Changes auto-save"
              )}
            </div>
            <div className="flex gap-3 flex-wrap justify-end">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-2"
              >
                {showPreview ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? "Edit" : "Preview"}
              </Button>
              <Button
                onClick={handleSaveNow}
                className="gap-2"
                disabled={isSaving || !activeCardId}
              >
                <Save className="h-4 w-4" />
                Save Now
              </Button>
              <Button onClick={handleExport} variant="outline" className="gap-2" disabled={isExporting}>
                <Download className="h-4 w-4" />
                {isExporting ? "Exporting..." : "Export PDF"}
              </Button>
            </div>
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
