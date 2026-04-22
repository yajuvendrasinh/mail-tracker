export const dynamic = 'force-dynamic';

import { supabaseAdmin } from "@/lib/supabase";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3,
  Clock, 
  ExternalLink,
  Eye, 
  Mail, 
  ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cookies } from "next/headers";

async function getStats() {
  const { count: totalEmails } = await supabaseAdmin
    .from('tracked_emails')
    .select('*', { count: 'exact', head: true });

  const { count: totalOpens } = await supabaseAdmin
    .from('email_opens')
    .select('*', { count: 'exact', head: true });

  const { count: proxyOpens } = await supabaseAdmin
    .from('email_opens')
    .select('*', { count: 'exact', head: true })
    .eq('is_proxy', true);

  return {
    totalEmails: totalEmails || 0,
    totalOpens: totalOpens || 0,
    proxyOpens: proxyOpens || 0
  };
}

async function getRecentEmails() {
  const { data, error } = await supabaseAdmin
    .from('tracked_emails')
    .select(`
      *,
      opens:email_opens(count)
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching emails:', error);
    return [];
  }

  return data;
}

export default async function DashboardPage() {
  // Tag this browser as a "Sender" so opens from here are ignored
  const cookieStore = await cookies();
  cookieStore.set('is_sender', 'true', { 
    maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
    path: '/',
    secure: true,
    sameSite: 'none' // Important for tracking pixels
  });

  const stats = await getStats();
  const emails = await getRecentEmails();

  return (
    <main className="container mx-auto py-10 px-4 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Mail Tracker</h1>
          <p className="text-muted-foreground mt-2">
            Real-time monitoring for your outgoing communications.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1 gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live System
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tracked</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmails}</div>
            <p className="text-xs text-muted-foreground">Emails generated</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Opens</CardTitle>
            <Eye className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOpens}</div>
            <p className="text-xs text-muted-foreground">Successful read detections</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Privacy-Shielded Opens</CardTitle>
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.proxyOpens}</div>
            <p className="text-xs text-muted-foreground">Filtered security signals</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Emails Table */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest emails registered for tracking</CardDescription>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-secondary">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px]">Subject / Recipient</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Opens</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No tracked emails yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  emails.map((email) => (
                    <TableRow key={email.id} className="group transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[280px]">
                            {email.subject}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {email.recipient}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={email.opens[0].count > 0 ? "default" : "outline"} className="font-mono">
                          {email.opens[0].count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link 
                          href={`/email/${email.id}`} 
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "opacity-0 group-hover:opacity-100 transition-opacity gap-2"
                          )}
                        >
                          View Insights
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <footer className="text-center text-xs text-muted-foreground pt-10">
        Built with Next.js 15, Vercel & Supabase
      </footer>
    </main>
  );
}
