import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LockedModuleTeaserProps {
  moduleName: string;
}

export function LockedModuleTeaser({ moduleName }: LockedModuleTeaserProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-muted/20 rounded-xl border border-dashed mt-8">
      <div className="p-4 bg-muted rounded-full mb-4">
        <Lock className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-2">Module Locked</h2>
      <p className="text-muted-foreground max-w-[500px] mb-8">
        The {moduleName} module is not included in your current subscription plan. Unlock this feature to automate and streamline your school's operations.
      </p>
      <Button size="lg" className="px-8">
        Contact Support to Upgrade
      </Button>
    </div>
  );
}
