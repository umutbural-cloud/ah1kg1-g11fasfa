import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HabitsToday from "./HabitsToday";
import HabitsBoard from "./HabitsBoard";
import HabitsStats from "./HabitsStats";

const HabitsView = () => {
  const [tab, setTab] = useState("today");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-light">習慣</div>
        <h1 className="text-2xl font-light tracking-wide">Alışkanlıklar</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-transparent p-0 h-auto gap-1 border-b border-border/60 rounded-none w-full justify-start">
          <TabsTrigger
            value="today"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b data-[state=active]:border-foreground rounded-none text-xs tracking-wide font-light px-3 py-2 -mb-px"
          >Bugün</TabsTrigger>
          <TabsTrigger
            value="master"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b data-[state=active]:border-foreground rounded-none text-xs tracking-wide font-light px-3 py-2 -mb-px"
          >Master</TabsTrigger>
          <TabsTrigger
            value="stats"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b data-[state=active]:border-foreground rounded-none text-xs tracking-wide font-light px-3 py-2 -mb-px"
          >İstatistik</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-6"><HabitsToday /></TabsContent>
        <TabsContent value="master" className="mt-6"><HabitsBoard /></TabsContent>
        <TabsContent value="stats" className="mt-6"><HabitsStats /></TabsContent>
      </Tabs>
    </div>
  );
};

export default HabitsView;
