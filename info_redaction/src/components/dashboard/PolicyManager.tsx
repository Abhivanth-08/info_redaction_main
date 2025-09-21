import { useState } from "react";
import { Shield, Settings, Brain, FileX, Eye, Edit3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PolicyRule {
  type: string;
  category: 'PII' | 'PHI';
  action: 'anonymize' | 'dummy_replacement' | 'rewrite' | 'encrypt';
  confidence: number;
  description: string;
}

const defaultPolicies: PolicyRule[] = [
  { type: 'Name', category: 'PII', action: 'dummy_replacement', confidence: 0.95, description: 'Personal names and identifiers' },
  { type: 'Address', category: 'PII', action: 'dummy_replacement', confidence: 0.90, description: 'Physical addresses' },
  { type: 'Email', category: 'PII', action: 'dummy_replacement', confidence: 0.99, description: 'Email addresses' },
  { type: 'Phone', category: 'PII', action: 'dummy_replacement', confidence: 0.95, description: 'Phone numbers' },
  { type: 'SSN', category: 'PII', action: 'anonymize', confidence: 0.99, description: 'Social Security Numbers' },
  { type: 'Credit Card', category: 'PII', action: 'anonymize', confidence: 0.98, description: 'Credit card numbers' },
  { type: 'Medical Record Number', category: 'PHI', action: 'anonymize', confidence: 0.97, description: 'Medical record identifiers' },
  { type: 'Medical Condition', category: 'PHI', action: 'dummy_replacement', confidence: 0.85, description: 'Health conditions' },
  { type: 'Medication', category: 'PHI', action: 'dummy_replacement', confidence: 0.80, description: 'Prescription medications' },
  { type: 'Doctor Name', category: 'PHI', action: 'dummy_replacement', confidence: 0.90, description: 'Healthcare provider names' },
];

interface PolicyManagerProps {
  onPolicyChange?: (policies: PolicyRule[]) => void;
}

export const PolicyManager = ({ onPolicyChange }: PolicyManagerProps) => {
  const [policies, setPolicies] = useState<PolicyRule[]>(defaultPolicies);
  const [globalSettings, setGlobalSettings] = useState({
    auditLogging: true,
    secureProcessing: true,
    memoryOnly: true,
    createOverlay: true,
    autoApprove: false,
    confidenceThreshold: 0.85
  });

  const updatePolicy = (index: number, field: keyof PolicyRule, value: any) => {
    const newPolicies = [...policies];
    newPolicies[index] = { ...newPolicies[index], [field]: value };
    setPolicies(newPolicies);
    onPolicyChange?.(newPolicies);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'anonymize':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'dummy_replacement':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'rewrite':
        return 'bg-secondary/20 text-secondary border-secondary/30';
      case 'encrypt':
        return 'bg-accent/20 text-accent border-accent/30';
      default:
        return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  const getCategoryColor = (category: string) => {
    return category === 'PII' 
      ? 'bg-primary/10 text-primary' 
      : 'bg-secondary/10 text-secondary';
  };

  const piiPolicies = policies.filter(p => p.category === 'PII');
  const phiPolicies = policies.filter(p => p.category === 'PHI');

  return (
    <Card className="glass-card border-card-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="font-cyber text-lg">Redaction Policies</CardTitle>
              <CardDescription>Configure AI-driven redaction strategies</CardDescription>
            </div>
          </div>
          <Button variant="neural" size="sm">
            <Settings className="h-4 w-4" />
            Advanced
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="policies" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="policies" className="font-cyber">
              Policy Rules
            </TabsTrigger>
            <TabsTrigger value="settings" className="font-cyber">
              Global Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="policies" className="space-y-6">
            {/* PII Policies */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Eye className="h-5 w-5 text-primary" />
                <h3 className="font-cyber font-semibold">PII (Personally Identifiable Information)</h3>
                <Badge variant="outline" className="border-primary text-primary">
                  {piiPolicies.length} rules
                </Badge>
              </div>
              
              <div className="space-y-3">
                {piiPolicies.map((policy, globalIndex) => {
                  const index = policies.findIndex(p => p === policy);
                  return (
                    <div
                      key={`pii-${index}`}
                      className="p-4 border border-card-border rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Badge className={getCategoryColor(policy.category)}>
                            {policy.category}
                          </Badge>
                          <span className="font-cyber font-medium">{policy.type}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">
                            {Math.round(policy.confidence * 100)}% confidence
                          </span>
                          <Edit3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {policy.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <Select
                          value={policy.action}
                          onValueChange={(value) => updatePolicy(index, 'action', value)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="anonymize">🔒 Anonymize</SelectItem>
                            <SelectItem value="dummy_replacement">🤖 AI Replacement</SelectItem>
                            <SelectItem value="rewrite">✏️ Rewrite</SelectItem>
                            <SelectItem value="encrypt">🔐 Encrypt</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Badge className={getActionColor(policy.action)}>
                          {policy.action.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PHI Policies */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Brain className="h-5 w-5 text-secondary" />
                <h3 className="font-cyber font-semibold">PHI (Protected Health Information)</h3>
                <Badge variant="outline" className="border-secondary text-secondary">
                  {phiPolicies.length} rules
                </Badge>
              </div>
              
              <div className="space-y-3">
                {phiPolicies.map((policy, globalIndex) => {
                  const index = policies.findIndex(p => p === policy);
                  return (
                    <div
                      key={`phi-${index}`}
                      className="p-4 border border-card-border rounded-lg hover:border-secondary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Badge className={getCategoryColor(policy.category)}>
                            {policy.category}
                          </Badge>
                          <span className="font-cyber font-medium">{policy.type}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">
                            {Math.round(policy.confidence * 100)}% confidence
                          </span>
                          <Edit3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {policy.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <Select
                          value={policy.action}
                          onValueChange={(value) => updatePolicy(index, 'action', value)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="anonymize">🔒 Anonymize</SelectItem>
                            <SelectItem value="dummy_replacement">🤖 AI Replacement</SelectItem>
                            <SelectItem value="rewrite">✏️ Rewrite</SelectItem>
                            <SelectItem value="encrypt">🔐 Encrypt</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Badge className={getActionColor(policy.action)}>
                          {policy.action.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-cyber font-semibold flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Processing Settings</span>
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border border-card-border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Audit Logging</p>
                      <p className="text-xs text-muted-foreground">Track all redaction actions</p>
                    </div>
                    <Switch
                      checked={globalSettings.auditLogging}
                      onCheckedChange={(checked) => 
                        setGlobalSettings(prev => ({ ...prev, auditLogging: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-card-border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Secure Processing</p>
                      <p className="text-xs text-muted-foreground">Memory-only processing</p>
                    </div>
                    <Switch
                      checked={globalSettings.secureProcessing}
                      onCheckedChange={(checked) => 
                        setGlobalSettings(prev => ({ ...prev, secureProcessing: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-card-border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Create Overlay PDF</p>
                      <p className="text-xs text-muted-foreground">Visual redaction summary</p>
                    </div>
                    <Switch
                      checked={globalSettings.createOverlay}
                      onCheckedChange={(checked) => 
                        setGlobalSettings(prev => ({ ...prev, createOverlay: checked }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-cyber font-semibold flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>AI Settings</span>
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border border-card-border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Auto-Approve High Confidence</p>
                      <p className="text-xs text-muted-foreground">Skip manual review for 95%+ confidence</p>
                    </div>
                    <Switch
                      checked={globalSettings.autoApprove}
                      onCheckedChange={(checked) => 
                        setGlobalSettings(prev => ({ ...prev, autoApprove: checked }))
                      }
                    />
                  </div>

                  <div className="p-3 border border-card-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">Confidence Threshold</p>
                      <span className="text-xs text-primary font-cyber">
                        {Math.round(globalSettings.confidenceThreshold * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Minimum confidence for PII detection
                    </p>
                    <input
                      type="range"
                      min="0.5"
                      max="0.99"
                      step="0.01"
                      value={globalSettings.confidenceThreshold}
                      onChange={(e) => 
                        setGlobalSettings(prev => ({ 
                          ...prev, 
                          confidenceThreshold: parseFloat(e.target.value) 
                        }))
                      }
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <FileX className="h-5 w-5 text-accent" />
                <h4 className="font-cyber font-semibold text-accent">Security Notice</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                All policies are applied using advanced AI models with end-to-end encryption. 
                Documents are processed in memory and never stored on external servers.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};