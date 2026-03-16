"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MoreHorizontal, ShieldAlert, ShieldCheck, Ban, Trash2, Crown, MailCheck } from "lucide-react"
import { toggleUserStatus, updateUserRole, updateUserTier, deleteUserAccount } from "@/app/dashboard/users/actions"
import { useTransition } from "react"

export type UserListItem = {
  uid: string
  email: string
  createdAt: string
  lastSignInTime: string
  disabled: boolean
  role: string
  tier: string
}

export function UserManagementTable({ users, currentUid }: { users: UserListItem[], currentUid: string }) {
  const [isPending, startTransition] = useTransition()

  const handleToggleStatus = (uid: string, disabled: boolean) => {
    startTransition(async () => {
      await toggleUserStatus(uid, disabled)
    })
  }

  const handleRoleChange = (uid: string, makeAdmin: boolean) => {
    startTransition(async () => {
      await updateUserRole(uid, makeAdmin)
    })
  }

  const handleTierChange = (uid: string, tier: "free" | "pro" | "enterprise") => {
    startTransition(async () => {
      await updateUserTier(uid, tier)
    })
  }

  const handleDelete = (uid: string) => {
    if (confirm("Are you absolute sure you want to permanently delete this account? This will wipe their Auth and Profile records.")) {
      startTransition(async () => {
        await deleteUserAccount(uid)
      })
    }
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Subscription</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={isPending ? "opacity-50 pointer-events-none transition-opacity" : ""}>
          {users.map((usr) => {
            const isSelf = usr.uid === currentUid

            return (
              <TableRow key={usr.uid}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium flex items-center gap-2">
                       {usr.email}
                       {isSelf && <Badge variant="secondary" className="h-5 text-[10px] px-1.5">You</Badge>}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{usr.uid}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {usr.disabled ? (
                    <Badge variant="destructive" className="h-5 text-[10px]">Suspended</Badge>
                  ) : (
                    <Badge variant="outline" className="h-5 text-[10px] bg-green-500/10 text-green-600 border-green-200">Active</Badge>
                  )}
                </TableCell>
                <TableCell>
                   <div className="flex items-center gap-1.5 text-xs">
                     {usr.role === "admin" ? <ShieldCheck className="h-3.5 w-3.5 text-primary" /> : <MailCheck className="h-3.5 w-3.5 text-muted-foreground" />}
                     <span className={usr.role === "admin" ? "font-semibold text-primary" : "text-muted-foreground"}>
                        {usr.role === "admin" ? "Admin" : "User"}
                     </span>
                   </div>
                </TableCell>
                <TableCell>
                  <Badge variant={usr.tier === "enterprise" ? "destructive" : usr.tier === "pro" ? "default" : "secondary"} className="h-5 text-[10px] capitalize">
                    {usr.tier !== "free" && <Crown className="h-2.5 w-2.5 mr-1" />}
                    {usr.tier}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {new Date(usr.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0" disabled={isSelf}>
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Manage Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <span>Subscription Tier</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuRadioGroup value={usr.tier} onValueChange={(t) => handleTierChange(usr.uid, t as any)}>
                            <DropdownMenuRadioItem value="free">Free Tier</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="pro">Pro Tier</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="enterprise">Enterprise Tier</DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      <DropdownMenuItem onClick={() => handleRoleChange(usr.uid, usr.role !== "admin")}>
                        {usr.role === "admin" ? (
                          <><Ban className="mr-2 h-4 w-4 text-orange-500" /> Revoke Admin</>
                        ) : (
                          <><ShieldAlert className="mr-2 h-4 w-4 text-primary" /> Grant Admin</>
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem onClick={() => handleToggleStatus(usr.uid, !usr.disabled)}>
                        {usr.disabled ? (
                           <><ShieldCheck className="mr-2 h-4 w-4 text-green-500" /> Unsuspend Account</>
                        ) : (
                           <><Ban className="mr-2 h-4 w-4 text-orange-500" /> Suspend Account</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(usr.uid)} className="text-destructive focus:bg-destructive focus:text-destructive-foreground relative">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Account
                      </DropdownMenuItem>

                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
