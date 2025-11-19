import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CareerCardBuilder from "@/components/CareerCardBuilder";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

const BuilderPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true, state: { from: `/builder/${id}` } });
    }
  }, [user, loading, navigate, id]);

  useEffect(() => {
    if (!loading && user && !id) {
      navigate("/", { replace: true });
    }
  }, [loading, user, id, navigate]);

  if (loading || !id || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return <CareerCardBuilder cardId={id} />;
};

export default BuilderPage;
