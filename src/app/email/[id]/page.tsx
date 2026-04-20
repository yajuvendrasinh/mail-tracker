export const dynamic = 'force-dynamic';

import { supabaseAdmin } from "@/lib/supabase";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  MapPin, 
  Globe, 
  Monitor, 
  Smartphone,
  ShieldQuestion,
  User,
  Hash,
  Clock
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";

function getDeviceIcon(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobi')) return <Smartphone className="h-4 w-4" />;
  if (ua.includes('bot') || ua.includes('proxy')) return <ShieldQuestion className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch email details
  const { data: email, error: emailError } = await supabaseAdmin
    .from('tracked_emails')
    .select('*')
    .eq('id', id)
    .single();

  if (emailError || !email) {
    notFound();
  }

  // Fetch opens
  const { data: opens, error: opensError } = await supabaseAdmin
    .from('email_opens')
    .select('*')
    .eq('email_id', id)
    .order('opened_at', { ascending: false });

  return (
    <main className="container mx-auto py-10 px-4 max-w-4xl space-y-8">
      <div className="flex items-center gap-4">
        <Link 
          href="/" 
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Insights</h1>
          <p className="text-muted-foreground truncate max-w-md">
            ID: {id}
          </p>
        </div>
      </div>

      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-secondary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
              <User className="h-3.5 w-3.5" /> Recipient
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{email.recipient}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-secondary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" /> Subject
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{email.subject}</div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Activity Timeline</h2>
          <Badge variant="outline" className="font-mono">
            {opens?.length || 0} Open{(opens?.length || 0) !== 1 ? 's' : ''}
          </Badge>
        </div>

        {opens && opens.length > 0 ? (
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-secondary before:to-transparent">
            {opens.map((open, index) => (
              <div key={open.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                {/* Dot */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-secondary bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  {getDeviceIcon(open.user_agent)}
                </div>
                
                {/* Content */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-secondary bg-background shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <MapPin className="h-3.5 w-3.5 text-blue-500" />
                        {open.city}, {open.country}
                      </div>
                      <time className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {format(new Date(open.opened_at), "MMM d, HH:mm:ss")}
                      </time>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-[10px] h-5 flex items-center gap-1">
                        <Hash className="h-2.5 w-2.5" /> {open.ip_address}
                      </Badge>
                      {open.is_proxy && (
                        <Badge variant="destructive" className="text-[10px] h-5">
                          Proxy/Bot
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-[10px] text-muted-foreground font-mono truncate border-t border-secondary mt-2 pt-2">
                      UA: {open.user_agent}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 py-12">
            <CardContent className="flex flex-col items-center justify-center space-y-3">
              <Clock className="h-10 w-10 text-muted-foreground/30" />
              <div className="text-muted-foreground text-sm">Waiting for the first open event...</div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
