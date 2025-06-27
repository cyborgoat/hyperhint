"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    ChevronDown, 
    Circle, 
    RefreshCw, 
        Settings,
    Plus,
    Trash2,
    TestTube,
    AlertCircle,
    CheckCircle,
    Loader2,
    Star,
    Edit
} from "lucide-react";

interface ModelInfo {
    id: string;
    name: string;
    provider: string;
    service: string;
    service_type: string;
    available: boolean;
    is_default: boolean;
}

interface ServiceInfo {
    id: string;
    type: string;
    name: string;
    enabled: boolean;
    available: boolean;
    models: string[];
    status: string;
    config: Record<string, string | boolean | string[]>;
}

interface ModelSelectorProps {
    selectedModel: string;
    onModelChange: (model: string) => void;
}

interface ServiceConfig {
    name: string;
    host?: string;
    api_key?: string;
    base_url?: string;
    models?: string[];
}

export default function ModelSelector({
    selectedModel,
    onModelChange,
}: ModelSelectorProps) {
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [services, setServices] = useState<Record<string, ServiceInfo>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Configuration dialog state
    const [configDialogOpen, setConfigDialogOpen] = useState(false);
    const [selectedServiceType, setSelectedServiceType] = useState<"ollama" | "openai">("ollama");
    const [serviceConfig, setServiceConfig] = useState<ServiceConfig>({
        name: "",
        host: "http://localhost:11434",
    });
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{
        success: boolean; 
        message?: string; 
        models?: string[];
        available?: boolean;
    }>({ success: false });
    const [testAbortController, setTestAbortController] = useState<AbortController | null>(null);
    
    // Model selection state
    const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
    const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
    
    // Edit mode state
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    
    // Refresh state for individual services
    const [refreshingServices, setRefreshingServices] = useState<Set<string>>(new Set());

    const fetchModels = useCallback(async () => {
        try {
            const response = await fetch("http://localhost:8000/api/models");
            if (response.ok) {
                const data = await response.json();
                setModels(data.all_models || []);

                // If selected model is not available, clear it
                if (
                    selectedModel &&
                    !data.all_models.find((m: ModelInfo) => m.id === selectedModel)
                ) {
                    onModelChange("");
                }
            } else {
                console.error("Failed to fetch models");
            }
        } catch (error) {
            console.error("Error fetching models:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedModel, onModelChange]);

    const fetchServices = async () => {
        try {
            const response = await fetch("http://localhost:8000/api/services");
            if (response.ok) {
                const data = await response.json();
                setServices(data);
            }
        } catch (error) {
            console.error("Error fetching services:", error);
        }
    };

    const refreshModels = async () => {
        setRefreshing(true);
        try {
            const response = await fetch(
                "http://localhost:8000/api/models/refresh",
                {
                    method: "POST",
                }
            );
            if (response.ok) {
                await fetchModels();
                await fetchServices();
            }
        } catch (error) {
            console.error("Error refreshing models:", error);
        } finally {
            setRefreshing(false);
        }
    };

    const testService = async () => {
        setTesting(true);
        setTestResult({ success: false });
        setDiscoveredModels([]);
        
        // Create abort controller for cancellation
        const abortController = new AbortController();
        setTestAbortController(abortController);
        
        try {
            const config: Record<string, string | string[]> = { ...serviceConfig };
            
            const response = await fetch("http://localhost:8000/api/services/test", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    service_type: selectedServiceType,
                    config: config,
                }),
                signal: abortController.signal, // Add abort signal
            });
            
            const result = await response.json();
            
            if (result.success && result.available) {
                setTestResult({
                    success: true,
                    available: true,
                    message: `✅ Connected successfully! Found ${result.models?.length || 0} models.`,
                    models: result.models || [],
                });
                setDiscoveredModels(result.models || []);
                
                // For OpenAI services, if models were provided in config, use those
                if (selectedServiceType === "openai" && serviceConfig.models?.length) {
                    setDiscoveredModels(serviceConfig.models);
                    // Auto-select the configured models
                    setSelectedModels(new Set(serviceConfig.models));
                } else {
                    // Auto-select all discovered models
                    setSelectedModels(new Set(result.models || []));
                }
            } else if (result.success && !result.available) {
                setTestResult({
                    success: false,
                    message: "❌ Service is reachable but not available. Check your configuration.",
                });
            } else {
                // Parse error message for better user feedback
                let errorMessage = result.error || "Test failed";
                
                // Handle common API errors
                if (errorMessage.includes("401") || errorMessage.includes("Authentication")) {
                    errorMessage = "❌ Authentication failed - Please check your API key";
                } else if (errorMessage.includes("403")) {
                    errorMessage = "❌ Access forbidden - Check your API key permissions";
                } else if (errorMessage.includes("404")) {
                    errorMessage = "❌ Endpoint not found - Check your Base URL";
                } else if (errorMessage.includes("Connection")) {
                    errorMessage = "❌ Connection failed - Check your endpoint URL and network";
                } else if (errorMessage.includes("timeout")) {
                    errorMessage = "❌ Connection timeout - Endpoint may be slow or unreachable";
                }
                
                setTestResult({
                    success: false,
                    message: errorMessage,
                });
            }
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') {
                setTestResult({
                    success: false,
                    message: "⏹️ Test cancelled by user",
                });
            } else {
                setTestResult({
                    success: false,
                    message: `❌ Connection error: ${error instanceof Error ? error.message : String(error)}`,
                });
            }
        } finally {
            setTesting(false);
            setTestAbortController(null);
        }
    };

    const cancelTest = () => {
        if (testAbortController) {
            testAbortController.abort();
        }
    };

    const addService = async () => {
        try {
            const serviceId = editingServiceId || `${selectedServiceType}_${Date.now()}`;
            const config: Record<string, string | string[]> = { 
                ...serviceConfig,
                models: Array.from(selectedModels) // Only include selected models
            };
            
            // If editing, remove the old service first
            if (editingServiceId) {
                await fetch(`http://localhost:8000/api/services/${editingServiceId}`, {
                    method: "DELETE",
                });
            }
            
            const response = await fetch("http://localhost:8000/api/services/add", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    service_id: serviceId,
                    service_type: selectedServiceType,
                    config: config,
                }),
            });
            
            const result = await response.json();
            
            if (result.success) {
                setConfigDialogOpen(false);
                resetConfigForm();
                await fetchModels();
                await fetchServices();
            } else {
                setTestResult({
                    success: false,
                    message: result.error || "Failed to save service",
                });
            }
        } catch (error) {
            setTestResult({
                success: false,
                message: `Error saving service: ${error}`,
            });
        }
    };

    const rescanModels = async (service: ServiceInfo) => {
        if (service.type !== "ollama") return;
        
        // Test the service to get latest models
        const config = service.config;
        setRefreshingServices(prev => new Set(prev).add(service.id));
        
        try {
            const response = await fetch("http://localhost:8000/api/services/test", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    service_type: "ollama",
                    config: config,
                }),
            });
            
            const result = await response.json();
            
            if (result.success && result.available) {
                // Set up for editing with new models
                setEditingServiceId(service.id);
                setSelectedServiceType("ollama");
                setServiceConfig({
                    name: service.name,
                    host: String(config.host || "http://localhost:11434"),
                });
                setDiscoveredModels(result.models || []);
                setSelectedModels(new Set(service.models)); // Keep existing selections
                setTestResult({
                    success: true,
                    available: true,
                    message: `Found ${result.models?.length || 0} models. Select which ones to enable.`,
                    models: result.models || [],
                });
                setConfigDialogOpen(true);
            } else {
                console.error("Failed to rescan models:", result.error);
                setTestResult({
                    success: false,
                    message: result.error || "Failed to rescan models",
                });
            }
        } catch (error) {
            console.error("Error rescanning models:", error);
            setTestResult({
                success: false,
                message: `Error rescanning models: ${error}`,
            });
        } finally {
            setRefreshingServices(prev => {
                const newSet = new Set(prev);
                newSet.delete(service.id);
                return newSet;
            });
        }
    };

    const editService = (service: ServiceInfo) => {
        // Set editing mode and pre-populate form
        setEditingServiceId(service.id);
        setSelectedServiceType(service.type as "ollama" | "openai");
        
        // Pre-populate the form with existing service config
        const config = service.config;
        if (service.type === "ollama") {
            setServiceConfig({
                name: service.name,
                host: String(config.host || "http://localhost:11434"),
            });
        } else if (service.type === "openai") {
            const models = Array.isArray(config.models) ? config.models : [];
            setServiceConfig({
                name: service.name,
                api_key: String(config.api_key || ""),
                base_url: String(config.base_url || ""),
                models: models,
            });
            setDiscoveredModels(models);
        }
        
        // Set selected models
        setSelectedModels(new Set(service.models));
        
        // Clear any previous test results
        setTestResult({ success: false });
        
        // Open the configuration dialog
        setConfigDialogOpen(true);
    };

    const removeService = async (serviceId: string) => {
        try {
            const response = await fetch(`http://localhost:8000/api/services/${serviceId}`, {
                method: "DELETE",
            });
            
            if (response.ok) {
                await fetchModels();
                await fetchServices();
            }
        } catch (error) {
            console.error("Error removing service:", error);
        }
    };

    const setDefaultModel = async (modelId: string) => {
        try {
            const response = await fetch("http://localhost:8000/api/models/default", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ model: modelId }),
            });
            
            if (response.ok) {
                await fetchModels();
            }
        } catch (error) {
            console.error("Error setting default model:", error);
        }
    };

    const resetConfigForm = () => {
        setServiceConfig({
            name: "",
            host: "http://localhost:11434",
        });
        setSelectedServiceType("ollama");
        setTestResult({ success: false });
        setDiscoveredModels([]);
        setSelectedModels(new Set());
        setEditingServiceId(null);
    };

    const toggleModelSelection = (modelId: string) => {
        const newSelected = new Set(selectedModels);
        if (newSelected.has(modelId)) {
            newSelected.delete(modelId);
        } else {
            newSelected.add(modelId);
        }
        setSelectedModels(newSelected);
    };

    useEffect(() => {
        fetchModels();
        fetchServices();
    }, [fetchModels]);

    const currentModel = models.find((m) => m.id === selectedModel);

    const getStatusColor = (service: ServiceInfo | ModelInfo) => {
        if ('status' in service) {
            // ServiceInfo
            if (service.status === "online") return "text-green-500";
            if (service.status === "configured") return "text-blue-500";
            return "text-red-500";
        } else {
            // ModelInfo - use available property
            return service.available ? "text-green-500" : "text-red-500";
        }
    };

    const getStatusText = (service: ServiceInfo | ModelInfo) => {
        if ('status' in service) {
            // ServiceInfo
            if (service.status === "online") return "Online";
            if (service.status === "configured") return "Configured";
            if (service.status.startsWith("error:")) return "Error";
            return "Offline";
        } else {
            // ModelInfo - use available property
            return service.available ? "Online" : "Offline";
        }
    };

    if (loading) {
        return (
            <Button variant="ghost" className="px-3 h-8 text-sm" disabled>
                <div className="flex items-center space-x-2">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Loading models...</span>
                </div>
            </Button>
        );
    }

    return (
        <div className="flex items-center space-x-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="px-3 h-8 text-sm">
                        <div className="flex items-center space-x-2">
                            {currentModel ? (
                                <>
                                    <Circle
                                        className={`h-2 w-2 fill-current ${getStatusColor(
                                            currentModel
                                        )}`}
                                    />
                                    <span>{currentModel.name}</span>
                                    <Badge variant="secondary" className="text-xs">
                                        {currentModel.provider}
                                    </Badge>
                                </>
                            ) : (
                                <span className="text-muted-foreground">No model selected</span>
                            )}
                            <ChevronDown className="w-3 h-3" />
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80">
                    {/* Refresh button */}
                    <DropdownMenuItem
                        onClick={refreshModels}
                        className="flex justify-between items-center mb-1 border-b cursor-pointer"
                        disabled={refreshing}
                    >
                        <span className="text-xs font-medium">Refresh Models</span>
                        <RefreshCw
                            className={`h-3 w-3 ${
                                refreshing ? "animate-spin" : ""}`}
                        />
                    </DropdownMenuItem>

                    {/* Model list */}
                    {models.length === 0 ? (
                        <DropdownMenuItem disabled>
                            <span className="text-xs text-muted-foreground">
                                No models configured. Click the settings icon to add services.
                            </span>
                        </DropdownMenuItem>
                    ) : (
                        models.map((model) => (
                            <DropdownMenuItem
                                key={model.id}
                                onClick={() => onModelChange(model.id)}
                                className="flex justify-between items-center py-3 cursor-pointer"
                            >
                                <div className="flex items-center space-x-3">
                                    <Circle
                                        className={`h-2 w-2 fill-current ${getStatusColor(
                                            model
                                        )}`}
                                    />
                                    <div className="flex flex-col">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-medium">
                                                {model.name}
                                            </span>
                                            {model.is_default && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    Default
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                            <span>{model.provider}</span>
                                            <span>•</span>
                                            <span
                                                className={getStatusColor(
                                                    model
                                                )}
                                            >
                                                {getStatusText(model)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {selectedModel === model.id && (
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                    )}
                                    {!model.is_default && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDefaultModel(model.id);
                                            }}
                                        >
                                            <Star className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Configuration Dialog */}
            <Dialog 
                open={configDialogOpen} 
                onOpenChange={(open) => {
                    setConfigDialogOpen(open);
                    if (!open) {
                        resetConfigForm();
                    }
                }}
            >
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Settings className="h-4 w-4" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Configure LLM Services</DialogTitle>
                        <DialogDescription>
                            Manage your LLM service endpoints and models. Ollama services will scan for available models, while OpenAI services require manual configuration.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs 
                        defaultValue="services"
                        value={editingServiceId ? "add" : undefined} 
                        onValueChange={(value) => {
                            if (value === "services") {
                                resetConfigForm();
                            }
                        }}
                        className="w-full"
                    >
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="services">Configured Services</TabsTrigger>
                            <TabsTrigger value="add">Add New Service</TabsTrigger>
                        </TabsList>

                        <TabsContent value="services" className="space-y-4">
                            <div className="space-y-4">
                                {Object.values(services).length === 0 ? (
                                    <Card>
                                        <CardContent className="pt-6">
                                                                                            <p className="text-sm text-muted-foreground text-center">
                                                    No services configured yet. Switch to the &quot;Add New Service&quot; tab to get started.
                                                </p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    Object.values(services).map((service) => (
                                        <Card key={service.id}>
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <Circle
                                                            className={`h-2 w-2 fill-current ${getStatusColor(
                                                                service
                                                            )}`}
                                                        />
                                                        <CardTitle className="text-sm">
                                                            {service.name}
                                                        </CardTitle>
                                                                                                    <Badge variant="outline" className="text-xs">
                                                {service.type}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {service.type === "ollama" && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => rescanModels(service)}
                                                    disabled={refreshingServices.has(service.id)}
                                                    className="h-6 w-6 p-0 text-green-500 hover:text-green-700"
                                                    title="Rescan models"
                                                >
                                                    <RefreshCw className={`h-3 w-3 ${refreshingServices.has(service.id) ? 'animate-spin' : ''}`} />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => editService(service)}
                                                className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700"
                                                title="Edit service"
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeService(service.id)}
                                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                                title="Remove service"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                                </div>
                                                <CardDescription className="text-xs">
                                                    {service.status} • {service.models.length} models
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <div className="text-xs space-y-1">
                                                    {service.type === "ollama" && (
                                                        <div>Host: {service.config.host}</div>
                                                    )}
                                                    {service.type === "openai" && (
                                                        <div>Endpoint: {service.config.base_url || "Official OpenAI"}</div>
                                                    )}
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {service.models.slice(0, 3).map((model) => (
                                                            <Badge key={model} variant="secondary" className="text-xs">
                                                                {model}
                                                            </Badge>
                                                        ))}
                                                        {service.models.length > 3 && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                +{service.models.length - 3} more
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="add" className="space-y-4">
                            <div className="space-y-4">
                                {/* Service Type Selection */}
                                <div className="space-y-2">
                                    <Label>Service Type</Label>
                                    <div className="flex space-x-2">
                                        <Button
                                            type="button"
                                            variant={selectedServiceType === "ollama" ? "default" : "outline"}
                                            onClick={() => {
                                                setSelectedServiceType("ollama");
                                                setServiceConfig({
                                                    name: "",
                                                    host: "http://localhost:11434",
                                                });
                                                setTestResult({ success: false });
                                                setDiscoveredModels([]);
                                                setSelectedModels(new Set());
                                            }}
                                            className="flex-1"
                                        >
                                            Ollama
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={selectedServiceType === "openai" ? "default" : "outline"}
                                            onClick={() => {
                                                setSelectedServiceType("openai");
                                                setServiceConfig({
                                                    name: "",
                                                    api_key: "",
                                                    base_url: "",
                                                    models: [],
                                                });
                                                setTestResult({ success: false });
                                                setDiscoveredModels([]);
                                                setSelectedModels(new Set());
                                            }}
                                            className="flex-1"
                                        >
                                            OpenAI Compatible
                                        </Button>
                                    </div>
                                </div>

                                {/* Service Configuration Form */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="service-name">Service Name</Label>
                                        <Input
                                            id="service-name"
                                            placeholder="My Ollama Service"
                                            value={serviceConfig.name}
                                            onChange={(e) =>
                                                setServiceConfig({ ...serviceConfig, name: e.target.value })
                                            }
                                        />
                                    </div>

                                    {selectedServiceType === "ollama" && (
                                        <div className="space-y-2">
                                            <Label htmlFor="ollama-host">Ollama Host</Label>
                                            <Input
                                                id="ollama-host"
                                                placeholder="http://localhost:11434"
                                                value={serviceConfig.host || ""}
                                                onChange={(e) =>
                                                    setServiceConfig({ ...serviceConfig, host: e.target.value })
                                                }
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Tip: Local Ollama is usually at http://localhost:11434
                                            </p>
                                        </div>
                                    )}

                                    {selectedServiceType === "openai" && (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="openai-base-url">Base URL (Optional)</Label>
                                                <Input
                                                    id="openai-base-url"
                                                    placeholder="https://api.openai.com/v1 (leave empty for official OpenAI)"
                                                    value={serviceConfig.base_url || ""}
                                                    onChange={(e) =>
                                                        setServiceConfig({ ...serviceConfig, base_url: e.target.value })
                                                    }
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Examples: DeepSeek: https://api.deepseek.com | Qwen: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="openai-api-key">API Key</Label>
                                                <Input
                                                    id="openai-api-key"
                                                    type="password"
                                                    placeholder="sk-..."
                                                    value={serviceConfig.api_key || ""}
                                                    onChange={(e) =>
                                                        setServiceConfig({ ...serviceConfig, api_key: e.target.value })
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="openai-models">Available Models (comma separated)</Label>
                                                <Input
                                                    id="openai-models"
                                                    placeholder="deepseek-chat,deepseek-reasoner (DeepSeek) | qwen-plus,qwen-turbo (Qwen) | gpt-4,gpt-3.5-turbo (OpenAI)"
                                                    value={serviceConfig.models?.join(",") || ""}
                                                    onChange={(e) => {
                                                        const inputValue = e.target.value;
                                                        const models = inputValue.split(",").map(m => m.trim()).filter(Boolean);
                                                        setServiceConfig({ 
                                                            ...serviceConfig, 
                                                            models: models
                                                        });
                                                        setDiscoveredModels(models);
                                                        // Automatically select all typed models
                                                        setSelectedModels(new Set(models));
                                                    }}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    List the models available on your OpenAI-compatible endpoint. For DeepSeek use: deepseek-chat,deepseek-reasoner
                                                </p>
                                            </div>
                                        </>
                                    )}

                                    {/* Test Connection */}
                                    <div className="space-y-2">
                                        {!testing ? (
                                            <Button
                                                type="button"
                                                onClick={testService}
                                                disabled={!serviceConfig.name}
                                                className="w-full"
                                                variant="outline"
                                            >
                                                <TestTube className="mr-2 h-4 w-4" />
                                                Test Connection
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                onClick={cancelTest}
                                                className="w-full"
                                                variant="destructive"
                                            >
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Cancel Test
                                            </Button>
                                        )}

                                        {testResult.message && (
                                            <div className={`flex items-center space-x-2 text-sm p-3 rounded-md ${
                                                testResult.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                                            }`}>
                                                {testResult.success ? (
                                                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                                                ) : (
                                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                                )}
                                                <span className="break-words">{testResult.message}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Model Selection */}
                                    {discoveredModels.length > 0 && (
                                        <div className="space-y-2">
                                            <Label>Select Models to Enable</Label>
                                            <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-2">
                                                {discoveredModels.map((modelId) => (
                                                    <div key={modelId} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`model-${modelId}`}
                                                            checked={selectedModels.has(modelId)}
                                                            onCheckedChange={() => toggleModelSelection(modelId)}
                                                        />
                                                        <Label htmlFor={`model-${modelId}`} className="text-sm cursor-pointer">
                                                            {modelId}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Select which models you want to make available in the app
                                            </p>
                                        </div>
                                    )}

                                    {/* Add/Edit Service */}
                                    <Button
                                        onClick={addService}
                                        disabled={!testResult.success || selectedModels.size === 0}
                                        className="w-full"
                                    >
                                        {editingServiceId ? (
                                            <>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Update Service ({selectedModels.size} models)
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add Service ({selectedModels.size} models)
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </div>
    );
}
