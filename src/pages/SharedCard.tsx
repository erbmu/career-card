import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CareerCardPreview } from "@/components/CareerCardPreview";
import { CareerCardData } from "@/types/career-card";
import { Loader2 } from "lucide-react";
import { logger } from "@/lib/validation";
import { cardApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const SharedCard = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cardData, setCardData] = useState<CareerCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true, state: { from: location.pathname } });
    }
  }, [user, authLoading, navigate, location.pathname]);

  useEffect(() => {
    if (!user) return;

    const fetchCard = async () => {
      if (!id) {
        setError("No card ID provided");
        setLoading(false);
        return;
      }

      try {
        const card = await cardApi.fetchCard(id);
        if (card?.cardData) {
          setCardData(card.cardData as CareerCardData);
        } else {
          setError("Card not found");
        }
      } catch (err) {
        logger.error("Error fetching shared card:", err);
        setError("Failed to load career card");
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, [id, user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--editor-bg))] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading career card...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error || !cardData) {
    return (
      <div className="min-h-screen bg-[hsl(var(--editor-bg))] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-destructive mb-2">⚠️ {error || "Card not found"}</p>
          <p className="text-muted-foreground">This career card may have been removed or the link is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--editor-bg))] py-8">
      <div className="container mx-auto px-4">
        <CareerCardPreview data={cardData} />
      </div>
    </div>
  );
};

export default SharedCard;
