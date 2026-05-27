"use client";
import React, { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

interface TopNavBarProps {
  features?: {
    showDomainSelector?: boolean;
    showViewModeSelector?: boolean;
    showPromptCaching?: boolean;
  };
}

const TopNavBar: React.FC<TopNavBarProps> = ({ features = {} }) => {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 sm:p-4">
      <div className="font-bold text-xl flex gap-2 items-center">
        <Image
          src={theme === "dark" ? "/wordmark-dark.svg" : "/wordmark.svg"}
          alt="Company Wordmark"
          width={112}
          height={20}
          className="h-4 sm:h-5 w-auto"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </div>
  );
};

export default TopNavBar;
