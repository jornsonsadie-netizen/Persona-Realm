import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useToast } from "../hooks/use-toast";

export function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(formData.email, formData.password);
      toast({ title: "Welcome back!", description: "Successfully logged in." });
      setLocation("/discover");
    } catch (err: any) {
      toast({ 
        title: "Login failed", 
        description: err.message || "Invalid email or password",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full justify-center mt-24 mb-16 px-4">
      <Card className="w-full max-w-md bg-black/40 backdrop-blur-md border-pink-500/20">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Identity Upload
          </CardTitle>
          <CardDescription>Enter your credentials to access the realm</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="runner@nc.com" 
                required 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-black/50 border-pink-500/30 focus:border-pink-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Access Code</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-black/50 border-pink-500/30 focus:border-pink-500"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold"
              disabled={loading}
            >
              {loading ? "Authenticating..." : "Establish Connection"}
            </Button>
            <p className="text-sm text-gray-400">
              New identity? <Link href="/sign-up" className="text-pink-400 hover:text-pink-300">Initialize here</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export function SignUpPage() {
  const { signup } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(formData.username, formData.email, formData.password);
      toast({ title: "Welcome to Persona Realm", description: "Identity successfully created." });
      setLocation("/discover");
    } catch (err: any) {
      toast({ 
        title: "Initialization failed", 
        description: err.message || "Could not create identity",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full justify-center mt-24 mb-16 px-4">
      <Card className="w-full max-w-md bg-black/40 backdrop-blur-md border-pink-500/20">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            New Identity
          </CardTitle>
          <CardDescription>Register your presence in the network</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Handle (Username)</Label>
              <Input 
                id="username" 
                placeholder="NeuralRunner" 
                required 
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="bg-black/50 border-pink-500/30 focus:border-pink-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="runner@nc.com" 
                required 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-black/50 border-pink-500/30 focus:border-pink-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Access Code</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-black/50 border-pink-500/30 focus:border-pink-500"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold"
              disabled={loading}
            >
              {loading ? "Initializing..." : "Register Identity"}
            </Button>
            <p className="text-sm text-gray-400">
              Already identified? <Link href="/sign-in" className="text-pink-400 hover:text-pink-300">Establish Connection</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
