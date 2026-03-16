import { getServerUser } from "@/lib/firebase/server-auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Crown, Sparkles, Shield, Zap } from "lucide-react"

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out LedgerMind",
    features: [
      "Up to 50 inventory items",
      "Basic sales tracking",
      "5 AI queries per day",
      "1 user",
      "Community support",
    ],
    limitations: ["Limited AI insights", "No export reports", "No priority support"],
    cta: "Current Plan",
    popular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    description: "For growing businesses that need more power",
    features: [
      "Unlimited inventory items",
      "Advanced sales analytics",
      "100 AI queries per day",
      "Up to 5 users",
      "Export reports (CSV, PDF)",
      "Priority support",
      "Custom categories",
      "Stock alerts & notifications",
    ],
    limitations: [],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "per month",
    description: "For large businesses with advanced needs",
    features: [
      "Everything in Pro",
      "Unlimited AI queries",
      "Unlimited users",
      "API access",
      "Advanced forecasting",
      "Dedicated support",
      "Custom integrations",
      "White-label options",
      "SLA guarantee",
    ],
    limitations: [],
    cta: "Contact Sales",
    popular: false,
  },
]

export default async function SubscriptionPage() {
  const user = await getServerUser()
  if (!user) redirect("/auth/login")

  const currentTier = user.profile?.subscription_tier || "free"

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">Subscription Plans</h1>
        <p className="text-muted-foreground mt-2">
          Choose the plan that&apos;s right for your business
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">Current plan:</span>
          <Badge
            variant={currentTier === "free" ? "secondary" : "default"}
            className="capitalize"
          >
            {currentTier === "free" ? null : <Crown className="h-3 w-3 mr-1" />}
            {currentTier}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => {
          const isCurrentTier = tier.name.toLowerCase() === currentTier
          return (
            <Card
              key={tier.name}
              className={`relative ${tier.popular ? "border-primary shadow-lg scale-[1.02]" : ""}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground ml-1">/{tier.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isCurrentTier ? "outline" : tier.popular ? "default" : "outline"}
                  disabled={isCurrentTier}
                >
                  {isCurrentTier ? (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Current Plan
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      {tier.cta}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription FAQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">Can I switch plans anytime?</h4>
            <p className="text-sm text-muted-foreground">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
            </p>
          </div>
          <div>
            <h4 className="font-medium">What payment methods are accepted?</h4>
            <p className="text-sm text-muted-foreground">
              We accept all major credit cards, debit cards, and bank transfers.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Is there a free trial for paid plans?</h4>
            <p className="text-sm text-muted-foreground">
              Yes, all paid plans come with a 14-day free trial. No credit card required.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
