"use client";

import type { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User as UserIcon, Mail, Phone, Shield, FileText, CircleUserRound } from 'lucide-react';
import { BackButton } from '../common/BackButton';

interface UserDetailsProps {
    user: User;
}

export function UserDetails({ user }: UserDetailsProps) {
    return (
        <div className="container mx-auto px-4 py-8">
            <Card className="max-w-2xl mx-auto shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-muted rounded-full">
                            <CircleUserRound className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-headline">{user.name}</CardTitle>
                            <CardDescription>Read-only view of user profile.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-start gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground mt-1" />
                            <div>
                                <p className="font-semibold text-sm">Email Address</p>
                                <p className="text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Phone className="h-5 w-5 text-muted-foreground mt-1" />
                            <div>
                                <p className="font-semibold text-sm">Phone Number</p>
                                <p className="text-muted-foreground">{user.phone || 'Not provided'}</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-3">
                            <Shield className="h-5 w-5 text-muted-foreground mt-1" />
                            <div>
                                <p className="font-semibold text-sm">Role</p>
                                <p>
                                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                        {user.role}
                                    </Badge>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                             <UserIcon className="h-5 w-5 text-muted-foreground mt-1" />
                            <div>
                                <p className="font-semibold text-sm">Status</p>
                                <p>
                                    <Badge variant={user.status === 'active' ? 'default' : 'destructive'} className={user.status === 'active' ? 'bg-accent text-accent-foreground' : ''}>
                                        {user.status}
                                    </Badge>
                                </p>
                            </div>
                        </div>
                    </div>
                     <div className="flex items-start gap-3 pt-4 border-t">
                        <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                        <div>
                            <p className="font-semibold text-sm">Admin Notes</p>
                            <p className="text-muted-foreground whitespace-pre-wrap">{user.notes || 'No notes available.'}</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <BackButton>Back to Dashboard</BackButton>
                </CardFooter>
            </Card>
        </div>
    );
}
