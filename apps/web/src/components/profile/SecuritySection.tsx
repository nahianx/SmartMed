import { useState } from "react";
import { Lock, Shield, CheckCircle, Loader2 } from "lucide-react";
import { 
  Button, 
  Input, 
  Label, 
  Switch, 
  Card, 
  Badge 
} from "@smartmed/ui";
import { toast } from "sonner";
import { useChangePassword, useToggleMFA, useProfile } from "@/hooks/useProfile";

export function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Query hooks
  const { data: profile } = useProfile();
  
  // Mutation hooks
  const changePasswordMutation = useChangePassword();
  const toggleMFAMutation = useToggleMFA();

  const handlePasswordChange = async () => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }
    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      newErrors.newPassword = "Password must contain at least one uppercase letter, one lowercase letter, and one number";
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });
      
      // Clear form on success
      setErrors({});
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleMfaToggle = async (enabled: boolean) => {
    try {
      await toggleMFAMutation.mutateAsync(enabled);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const validatePasswordStrength = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;
    return { checks, score };
  };

  const passwordStrength = newPassword ? validatePasswordStrength(newPassword) : null;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium">Security Settings</h3>
        <p className="text-slate-600 mt-1">
          Manage your password, two-factor authentication, and account security
        </p>
      </div>

      {/* Password Change */}
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Lock className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium">Change Password</h4>
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
              placeholder="Enter your current password"
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
              placeholder="Enter your new password"
            />
            {errors.newPassword && (
              <p className="text-sm text-red-600">{errors.newPassword}</p>
            )}
            
            {/* Password strength indicator */}
            {passwordStrength && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-16 rounded-full ${
                    passwordStrength.score < 3 ? 'bg-red-200' :
                    passwordStrength.score < 4 ? 'bg-yellow-200' : 'bg-green-200'
                  }`}>
                    <div className={`h-full rounded-full transition-all ${
                      passwordStrength.score < 3 ? 'bg-red-500' :
                      passwordStrength.score < 4 ? 'bg-yellow-500' : 'bg-green-500'
                    }`} style={{ width: `${(passwordStrength.score / 5) * 100}%` }}></div>
                  </div>
                  <span className="text-sm text-slate-600">
                    {passwordStrength.score < 3 ? 'Weak' :
                     passwordStrength.score < 4 ? 'Medium' : 'Strong'}
                  </span>
                </div>
                
                <div className="text-xs space-y-1">
                  <div className={passwordStrength.checks.length ? 'text-green-600' : 'text-slate-400'}>
                    ✓ At least 8 characters
                  </div>
                  <div className={passwordStrength.checks.uppercase ? 'text-green-600' : 'text-slate-400'}>
                    ✓ One uppercase letter
                  </div>
                  <div className={passwordStrength.checks.lowercase ? 'text-green-600' : 'text-slate-400'}>
                    ✓ One lowercase letter
                  </div>
                  <div className={passwordStrength.checks.number ? 'text-green-600' : 'text-slate-400'}>
                    ✓ One number
                  </div>
                </div>
              </div>
            )}
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
              placeholder="Confirm your new password"
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          <Button 
            onClick={handlePasswordChange}
            disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
            className="w-full"
          >
            {changePasswordMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Update Password
          </Button>
        </div>
      </Card>

      {/* Two-Factor Authentication */}
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium">Two-Factor Authentication</h4>
            <p className="text-slate-600 mt-1">
              Add an extra layer of security to your account
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={profile?.isMfaEnabled || false}
              onCheckedChange={handleMfaToggle}
              disabled={toggleMFAMutation.isPending}
            />
            <Badge variant={profile?.isMfaEnabled ? "default" : "secondary"}>
              {profile?.isMfaEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          {profile?.isMfaEnabled ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Two-factor authentication is active</span>
              </div>
              <p className="text-green-700 mt-1 text-sm">
                Your account is protected with an additional security layer
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-amber-800">
                <p className="font-medium">Enhance your account security</p>
                <p className="text-sm mt-1">
                  Enable two-factor authentication to protect your account from unauthorized access
                </p>
              </div>
            </div>
          )}
          
          {toggleMFAMutation.isPending && (
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Updating MFA settings...</span>
            </div>
          )}
        </div>
      </Card>

      {/* Account Information */}
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium">Account Information</h4>
            <p className="text-slate-600 mt-1">
              Your account status and verification details
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="font-medium">Email Address</p>
              <p className="text-sm text-slate-600">{profile?.email}</p>
            </div>
            <Badge variant="default" className="bg-green-100 text-green-800">
              Verified
            </Badge>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="font-medium">Account Type</p>
              <p className="text-sm text-slate-600">
                {profile?.role === 'DOCTOR' ? 'Healthcare Provider' : 
                 profile?.role === 'PATIENT' ? 'Patient' : 
                 profile?.role}
              </p>
            </div>
            <Badge variant="default">
              Active
            </Badge>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">Account Created</p>
              <p className="text-sm text-slate-600">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Security Tips */}
      <Card className="p-6 bg-slate-50">
        <h4 className="font-medium mb-4">Security Tips</h4>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <p>Use a unique password that you don&apos;t use for other accounts</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <p>Enable two-factor authentication for additional security</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <p>Never share your login credentials with anyone</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <p>Log out from shared or public computers</p>
          </div>
        </div>
      </Card>
    </div>
  );
}