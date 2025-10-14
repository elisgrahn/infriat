import { useState } from "react";
import { ManifestUpload } from "@/components/ManifestUpload";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Admin = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tillbaka
        </Button>

        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin</h1>
            <p className="text-muted-foreground">
              Ladda upp och analysera valmanifest
            </p>
          </div>

          <ManifestUpload />
        </div>
      </div>
    </div>
  );
};

export default Admin;