import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSettingsSchema, type InsertSettings } from "@shared/schema";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface OdooLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function OdooLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="30" cy="30" r="26" fill="#714B67" />
      <circle cx="30" cy="30" r="16" fill="white" />
      <circle cx="30" cy="30" r="8" fill="#714B67" />
      <text x="68" y="42" fontFamily="Arial, sans-serif" fontSize="34" fontWeight="700" fill="#714B67">
        Odoo
      </text>
    </svg>
  );
}

export function OdooLoginDialog({ open, onOpenChange }: OdooLoginDialogProps) {
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

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  function onSubmit(data: InsertSettings) {
    updateSettings(data, {
      onSuccess: () => {
        onOpenChange(false);
      },
      onError: (error) => {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden border-0 shadow-2xl sm:max-w-[420px]"
        style={{ borderRadius: "8px" }}
        data-testid="dialog-odoo-login"
      >
        <VisuallyHidden>
          <DialogTitle>Login with your Odoo</DialogTitle>
          <DialogDescription>Enter your Odoo URL, database, email, and password to connect.</DialogDescription>
        </VisuallyHidden>
        <div className="flex flex-col">
          {/* Header strip */}
          <div
            className="flex flex-col items-center justify-center py-8 px-6"
            style={{ backgroundColor: "#714B67" }}
          >
            <OdooLogo className="h-12 w-auto mb-3" />
            <p className="text-white/80 text-sm font-medium tracking-wide mt-1">
              Connect your Odoo instance
            </p>
          </div>

          {/* Form body */}
          <div className="bg-white dark:bg-zinc-900 px-8 py-7">
            {isLoadingSettings ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#714B67" }} />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="odooUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#714B67" }}
                        >
                          Odoo URL
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://mycompany.odoo.com"
                            data-testid="input-odoo-url"
                            className="rounded border-zinc-300 dark:border-zinc-700 focus-visible:ring-[#714B67] focus-visible:border-[#714B67] h-10"
                            {...field}
                          />
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
                        <FormLabel
                          className="text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#714B67" }}
                        >
                          Database
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="my-company-db"
                            data-testid="input-odoo-db"
                            className="rounded border-zinc-300 dark:border-zinc-700 focus-visible:ring-[#714B67] focus-visible:border-[#714B67] h-10"
                            {...field}
                          />
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
                        <FormLabel
                          className="text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#714B67" }}
                        >
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="admin@example.com"
                            type="email"
                            data-testid="input-odoo-email"
                            className="rounded border-zinc-300 dark:border-zinc-700 focus-visible:ring-[#714B67] focus-visible:border-[#714B67] h-10"
                            {...field}
                          />
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
                        <FormLabel
                          className="text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#714B67" }}
                        >
                          Password
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            data-testid="input-odoo-password"
                            className="rounded border-zinc-300 dark:border-zinc-700 focus-visible:ring-[#714B67] focus-visible:border-[#714B67] h-10"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="w-full h-11 font-semibold text-white rounded text-sm tracking-wide"
                      style={{ backgroundColor: "#714B67", borderColor: "#714B67" }}
                      data-testid="button-odoo-login"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting…
                        </>
                      ) : (
                        "Log in"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
