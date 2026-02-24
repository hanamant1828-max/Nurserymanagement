import { useLogin, useUser } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Sprout, Lock, User as UserIcon, AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const loginSchema = api.auth.login.input;

export default function LoginPage() {
  const { mutate: login, isPending, error } = useLogin();
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (user) setLocation("/");
  }, [user, setLocation]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    login(data, {
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: err.message || "Invalid username or password",
        });
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f0f9f0] p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.2, 0.3]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            opacity: [0.2, 0.1, 0.2]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-24 -right-24 w-[500px] h-[500px] bg-accent/20 rounded-full blur-3xl" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md z-10"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            className="w-20 h-20 bg-gradient-to-br from-green-600 to-green-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-green-900/20 mb-6"
          >
            <Sprout className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-4xl font-display font-bold text-green-900 tracking-tight">Kisan Hi-Tech Nursery</h1>
          <p className="text-green-700/80 mt-2 font-medium">Kalloli, Tq: Mudalagi, Dist: Belagavi</p>
          <div className="flex gap-4 mt-2 text-xs text-green-600/60">
            <span>Ph: 7348998635</span>
            <span>Ph: 9663777255</span>
          </div>
        </div>

        <Card className="border-white/40 shadow-2xl shadow-green-900/10 backdrop-blur-md bg-white/90 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-400 to-green-500" />
          
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-green-900">Welcome Back</CardTitle>
            <CardDescription className="text-green-700/60">Enter your credentials to manage your nursery</CardDescription>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error.message || "Invalid username or password"}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-800">Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600/50" />
                          <Input 
                            placeholder="Enter username" 
                            {...field} 
                            className="h-12 pl-10 bg-white/50 border-green-100 focus:border-green-500 focus:ring-green-500/20 transition-all rounded-xl" 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-800">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600/50" />
                          <Input 
                            type="password" 
                            placeholder="Enter password" 
                            {...field} 
                            className="h-12 pl-10 bg-white/50 border-green-100 focus:border-green-500 focus:ring-green-500/20 transition-all rounded-xl" 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all rounded-xl active:scale-[0.98]"
                  disabled={isPending}
                >
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sprout className="w-5 h-5" />
                      </motion.div>
                      Signing in...
                    </div>
                  ) : "Sign In"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-green-800/50 mt-8"
        >
          Secure Access • Kisan Hi-Tech Nursery Management
        </motion.p>
      </div>
    </div>
  );
}
