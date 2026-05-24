import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSettingsSchema, type InsertSettings } from "@shared/schema";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Save, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface SettingsDialogProps {
  forceOpen?: boolean;
}

export function SettingsDialog({ forceOpen = false }: SettingsDialogProps) {
  const [open, setOpen] = useState(forceOpen);
  const { data: settings, isLoading: isLoadingSettings } = useSettings();
  const { mutate: updateSettings, isPending } = useUpdateSettings();
  const { toast } = useToast();

  const form = useForm<InsertSettings>({
    resolver: zodResolver(insertSettingsSchema),
    defaultValues: {
      odooUrl: "",
      odooDb: "",
      odooUsername: "",
      odooPassword: "",
      responseStyle: "detailed",
    },
  });

  // Reset form when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  // Keep dialog open if forceOpen is true, but allow manual control otherwise
  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  function onSubmit(data: InsertSettings) {
    updateSettings(data, {
      onSuccess: () => {
        toast({
          title: "Settings Saved",
          description: "Your Odoo connection details have been updated.",
        });
        if (!forceOpen) setOpen(false);
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={forceOpen ? undefined : setOpen}>
      {!forceOpen && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary transition-colors">
            <Settings className="h-5 w-5" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-display text-primary">Connection Settings</DialogTitle>
          <DialogDescription>
            Configure your Odoo instance details to enable the assistant.
          </DialogDescription>
        </DialogHeader>

        {isLoadingSettings ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="odooUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Odoo URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://your-odoo-instance.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="odooDb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Database Name</FormLabel>
                    <FormControl>
                      <Input placeholder="odoo_db" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="odooUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email / Username</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="odooPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password / API Key</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t border-border pt-4 mt-2">
                <FormField
                  control={form.control}
                  name="responseStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Response Style</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "detailed"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-response-style">
                            <SelectValue placeholder="Choose response style" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="detailed" data-testid="option-detailed">Detailed — Full details for every record</SelectItem>
                          <SelectItem value="concise" data-testid="option-concise">Concise — Key info only, compact format</SelectItem>
                          <SelectItem value="summary" data-testid="option-summary">Summary — Overviews with totals and highlights</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Controls how the assistant formats its responses
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Configuration
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
