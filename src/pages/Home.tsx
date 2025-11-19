import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cardApi, type CardRecord } from "@/lib/api";
import { createEmptyCareerCardData } from "@/lib/defaultCardData";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, PencilLine, Settings2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const Home = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, loading, navigate]);

  const loadCards = async () => {
    try {
      setIsLoadingCards(true);
      const response = await cardApi.listCards();
      setCards(response.cards || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load cards";
      toast.error(message);
    } finally {
      setIsLoadingCards(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadCards();
  }, [user]);

  const handleCreateCard = async () => {
    if (!user) return;
    try {
      const defaultData = createEmptyCareerCardData(`${user.firstName} ${user.lastName}`.trim());
      const created = await cardApi.createCard(defaultData);
      await loadCards();
      navigate(`/builder/${created.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create card";
      toast.error(message);
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/builder/${id}`);
  };

  const handleSettings = () => {
    toast.info("Profile settings coming soon.");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--editor-bg))]">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-tight">Recrio</div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleSettings}>
              <Settings2 className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Home</p>
          <h1 className="text-3xl font-semibold">Welcome, {user.firstName}</h1>
          <p className="text-muted-foreground max-w-2xl">
            Manage all your career cards in one place. Start a new one or refine your existing profiles before sharing them with recruiters.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your Career Cards</h2>
            <Button onClick={handleCreateCard} className="gap-2">
              <Plus className="h-4 w-4" />
              New Card
            </Button>
          </div>

          {isLoadingCards ? (
            <div className="min-h-[200px] flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <Card key={card.id} className="flex flex-col justify-between border-primary/10">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {card.cardData.profile.title || 'Untitled Role'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(card.updatedAt), { addSuffix: true })}
                    </p>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{card.cardData.profile.name}</p>
                      <p className="text-sm text-muted-foreground">{card.cardData.profile.location || 'Location TBD'}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(card.id)} className="gap-2">
                      <PencilLine className="h-4 w-4" /> Edit
                    </Button>
                  </CardContent>
                </Card>
              ))}
              <Card
                role="button"
                onClick={handleCreateCard}
                className="border-dashed border-2 border-primary/30 hover:border-primary transition-all flex items-center justify-center min-h-[180px] cursor-pointer"
              >
                <div className="text-center space-y-2">
                  <Plus className="h-6 w-6 text-primary mx-auto" />
                  <p className="font-medium">Create New Career Card</p>
                  <p className="text-sm text-muted-foreground">Start a fresh profile from scratch</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
