import { Outlet } from "react-router-dom";
import { StickyBarProvider } from "@/store/StickyBarContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "./Footer";

export function MainLayout() {
  return (
    <StickyBarProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <Outlet />
        <Footer />
      </div>
    </StickyBarProvider>
  );
}
