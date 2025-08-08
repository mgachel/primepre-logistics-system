import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonnelSection } from "@/components/admin/PersonnelSection";
import { RolesSection } from "@/components/admin/RolesSection";

export default function Admins() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="personnel" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personnel">Personnel</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>
        
        <TabsContent value="personnel" className="space-y-6">
          <PersonnelSection />
        </TabsContent>
        
        <TabsContent value="roles" className="space-y-6">
          <RolesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}