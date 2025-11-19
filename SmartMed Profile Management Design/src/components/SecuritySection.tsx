import { useState } from "react";
import { Lock, Shield, ExternalLink, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { toast } from "sonner@2.0.3";

export function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isGoogleConnected] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePasswordChange = () => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }
    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the validation errors");
      return;
    }

    setErrors({});
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated successfully");
  };

  const handleMfaToggle = (enabled: boolean) => {
    setMfaEnabled(enabled);
    if (enabled) {
      toast.success("Two-factor authentication enabled");
    } else {
      toast.success("Two-factor authentication disabled");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3>Security Settings</h3>
        <p className="text-slate-600 mt-1">
          Manage your password, two-factor authentication, and connected accounts
        </p>
      </div>

      {/* Password Change */}
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Lock className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4>Change Password</h4>
            <p className="text-slate-600 mt-1">
              Update your password regularly to keep your account secure
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (errors.currentPassword) {
                  setErrors((prev) => ({ ...prev, currentPassword: "" }));
                }
              }}
            />
            {errors.currentPassword && (
              <p className="text-sm text-red-600">{errors.currentPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.newPassword) {
                  setErrors((prev) => ({ ...prev, newPassword: "" }));
                }
              }}
            />
            {errors.newPassword && (
              <p className="text-sm text-red-600">{errors.newPassword}</p>
            )}
            <p className="text-xs text-slate-500">
              Must be at least 8 characters with a mix of letters, numbers, and symbols
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) {
                  setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }
              }}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          <Button onClick={handlePasswordChange}>Update Password</Button>
        </div>
      </Card>

      {/* Two-Factor Authentication */}
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h4>Two-Factor Authentication</h4>
            <p className="text-slate-600 mt-1">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span>Enable 2FA</span>
              {mfaEnabled && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Active
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Require a verification code in addition to your password
            </p>
          </div>
          <Switch checked={mfaEnabled} onCheckedChange={handleMfaToggle} />
        </div>

        {mfaEnabled && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              Authenticator app is configured. Use your authenticator app to generate codes
              when signing in.
            </p>
            <Button variant="outline" size="sm" className="mt-3">
              View Backup Codes
            </Button>
          </div>
        )}

        {!mfaEnabled && (
          <Button variant="outline" className="mt-4" onClick={() => handleMfaToggle(true)}>
            Set Up 2FA
          </Button>
        )}
      </Card>

      {/* Connected Accounts */}
      <Card className="p-6">
        <div className="mb-6">
          <h4>Connected Accounts</h4>
          <p className="text-slate-600 mt-1">
            Manage third-party services connected to your SmartMed account
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>
              <div>
                <p>Google</p>
                {isGoogleConnected && (
                  <p className="text-sm text-slate-600">sarah.anderson@gmail.com</p>
                )}
              </div>
            </div>

            {isGoogleConnected ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Connected
                </Badge>
                <Button variant="outline" size="sm">
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Session Management */}
      <Card className="p-6">
        <div className="mb-6">
          <h4>Active Sessions</h4>
          <p className="text-slate-600 mt-1">
            View and manage devices where you're currently signed in
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p>MacBook Pro - Chrome</p>
              <p className="text-sm text-slate-600 mt-1">
                New York, NY • Current session
              </p>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p>iPhone 14 - Safari</p>
              <p className="text-sm text-slate-600 mt-1">
                New York, NY • Last active 2 hours ago
              </p>
            </div>
            <Button variant="ghost" size="sm">
              Sign Out
            </Button>
          </div>
        </div>

        <Button variant="outline" className="mt-4">
          Sign Out All Devices
        </Button>
      </Card>
    </div>
  );
}
