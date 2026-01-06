"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Clock, 
  Plus, 
  Trash2, 
  Copy, 
  Loader2, 
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Sparkles,
  Coffee,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  RefreshCw,
  Info,
  GripVertical
} from "lucide-react";
import { 
  Button, 
  Label, 
  Switch, 
  Card,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@smartmed/ui";
import { toast } from "sonner";
import { useDoctorAvailability, useUpdateAvailability, useDeleteAvailabilitySlot } from "@/hooks/useProfile";
import { DoctorAvailability } from "@smartmed/types";
import { doctorApi } from "@/services/api";
import { cn } from "@/lib/utils";

interface AvailabilitySectionProps {
  onUnsavedChanges: (hasChanges: boolean) => void;
}

interface TimeSlot {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  hasBreak: boolean;
  breakStart?: string;
  breakEnd?: string;
  isAvailable: boolean;
}

interface DaySchedule {
  day: string;
  shortDay: string;
  dayOfWeek: number;
  isOff: boolean;
  slots: TimeSlot[];
}

// Time grid intervals (30 min slots from 6 AM to 10 PM)
const TIME_SLOTS = Array.from({ length: 33 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6;
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

const DAYS_OF_WEEK = [
  { name: "Sunday", short: "Sun", value: 0 },
  { name: "Monday", short: "Mon", value: 1 },
  { name: "Tuesday", short: "Tue", value: 2 },
  { name: "Wednesday", short: "Wed", value: 3 },
  { name: "Thursday", short: "Thu", value: 4 },
  { name: "Friday", short: "Fri", value: 5 },
  { name: "Saturday", short: "Sat", value: 6 },
];

// Quick schedule presets
const SCHEDULE_PRESETS = [
  {
    name: "Standard Office",
    icon: Sun,
    description: "Mon-Fri, 9 AM - 5 PM with lunch break",
    schedule: {
      workDays: [1, 2, 3, 4, 5],
      startTime: "09:00",
      endTime: "17:00",
      hasBreak: true,
      breakStart: "12:00",
      breakEnd: "13:00",
    }
  },
  {
    name: "Morning Clinic",
    icon: Sunrise,
    description: "Mon-Sat, 7 AM - 1 PM",
    schedule: {
      workDays: [1, 2, 3, 4, 5, 6],
      startTime: "07:00",
      endTime: "13:00",
      hasBreak: false,
    }
  },
  {
    name: "Evening Clinic",
    icon: Sunset,
    description: "Mon-Fri, 4 PM - 9 PM",
    schedule: {
      workDays: [1, 2, 3, 4, 5],
      startTime: "16:00",
      endTime: "21:00",
      hasBreak: false,
    }
  },
  {
    name: "Extended Hours",
    icon: Moon,
    description: "Mon-Sat, 8 AM - 8 PM with break",
    schedule: {
      workDays: [1, 2, 3, 4, 5, 6],
      startTime: "08:00",
      endTime: "20:00",
      hasBreak: true,
      breakStart: "13:00",
      breakEnd: "14:00",
    }
  },
];

function rangesOverlap(a: TimeSlot, b: TimeSlot) {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function buildScheduleFromAvailability(availability: DoctorAvailability[]): DaySchedule[] {
  return DAYS_OF_WEEK.map(day => {
    const daySlots = availability
      .filter(slot => slot.dayOfWeek === day.value && slot.isAvailable)
      .map(slot => ({
        id: slot.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        hasBreak: slot.hasBreak,
        breakStart: slot.breakStart,
        breakEnd: slot.breakEnd,
        isAvailable: slot.isAvailable,
      }));

    return {
      day: day.name,
      shortDay: day.short,
      dayOfWeek: day.value,
      isOff: daySlots.length === 0,
      slots: daySlots,
    };
  });
}

export function AvailabilitySection({ onUnsavedChanges }: AvailabilitySectionProps) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(() => buildScheduleFromAvailability([]));
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: number; time: string } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: number; time: string } | null>(null);
  const [copyFromDay, setCopyFromDay] = useState<string>("");
  
  // Query hooks
  const { data: availabilityData, isLoading, isError, refetch } = useDoctorAvailability();
  const updateAvailabilityMutation = useUpdateAvailability();
  const deleteSlotMutation = useDeleteAvailabilitySlot();
  
  // Initialize schedule from availability data
  useEffect(() => {
    if (!availabilityData) return;
    setSchedule(buildScheduleFromAvailability(availabilityData));
    setHasChanges(false);
  }, [availabilityData]);
  
  // Notify parent of changes
  useEffect(() => {
    onUnsavedChanges(hasChanges);
  }, [hasChanges, onUnsavedChanges]);

  // Calculate total hours per week
  const totalHours = useMemo(() => {
    let minutes = 0;
    schedule.forEach(day => {
      day.slots.forEach(slot => {
        const slotMinutes = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
        if (slot.hasBreak && slot.breakStart && slot.breakEnd) {
          const breakMinutes = timeToMinutes(slot.breakEnd) - timeToMinutes(slot.breakStart);
          minutes += slotMinutes - breakMinutes;
        } else {
          minutes += slotMinutes;
        }
      });
    });
    return Math.round(minutes / 60 * 10) / 10;
  }, [schedule]);

  // Check if a time slot is within any available slot for a day
  const isTimeAvailable = useCallback((dayOfWeek: number, time: string): boolean => {
    const day = schedule.find(d => d.dayOfWeek === dayOfWeek);
    if (!day || day.isOff) return false;
    
    const timeMinutes = timeToMinutes(time);
    return day.slots.some(slot => {
      const startMinutes = timeToMinutes(slot.startTime);
      const endMinutes = timeToMinutes(slot.endTime);
      
      // Check if within break time
      if (slot.hasBreak && slot.breakStart && slot.breakEnd) {
        const breakStartMinutes = timeToMinutes(slot.breakStart);
        const breakEndMinutes = timeToMinutes(slot.breakEnd);
        if (timeMinutes >= breakStartMinutes && timeMinutes < breakEndMinutes) {
          return false;
        }
      }
      
      return timeMinutes >= startMinutes && timeMinutes < endMinutes;
    });
  }, [schedule]);

  // Check if time is during break
  const isBreakTime = useCallback((dayOfWeek: number, time: string): boolean => {
    const day = schedule.find(d => d.dayOfWeek === dayOfWeek);
    if (!day || day.isOff) return false;
    
    const timeMinutes = timeToMinutes(time);
    return day.slots.some(slot => {
      if (slot.hasBreak && slot.breakStart && slot.breakEnd) {
        const breakStartMinutes = timeToMinutes(slot.breakStart);
        const breakEndMinutes = timeToMinutes(slot.breakEnd);
        return timeMinutes >= breakStartMinutes && timeMinutes < breakEndMinutes;
      }
      return false;
    });
  }, [schedule]);

  // Merge overlapping time slots
  const mergeOverlappingSlots = (slots: TimeSlot[]): TimeSlot[] => {
    if (slots.length <= 1) return slots;
    
    const sorted = [...slots].sort((a, b) => 
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
    
    const merged: TimeSlot[] = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];
      
      if (timeToMinutes(current.startTime) <= timeToMinutes(last.endTime)) {
        // Merge slots
        last.endTime = timeToMinutes(current.endTime) > timeToMinutes(last.endTime) 
          ? current.endTime 
          : last.endTime;
        // Keep break from either slot if exists
        if (current.hasBreak && current.breakStart && current.breakEnd) {
          last.hasBreak = true;
          last.breakStart = current.breakStart;
          last.breakEnd = current.breakEnd;
        }
      } else {
        merged.push(current);
      }
    }
    
    return merged;
  };

  // Handle mouse down on grid cell
  const handleMouseDown = (dayOfWeek: number, time: string) => {
    setIsDragging(true);
    setDragStart({ day: dayOfWeek, time });
    setDragEnd({ day: dayOfWeek, time });
  };

  // Handle mouse enter on grid cell (during drag)
  const handleMouseEnter = (dayOfWeek: number, time: string) => {
    if (isDragging && dragStart && dragStart.day === dayOfWeek) {
      setDragEnd({ day: dayOfWeek, time });
    }
  };

  // Handle mouse up (end drag)
  const handleMouseUp = () => {
    if (isDragging && dragStart && dragEnd && dragStart.day === dragEnd.day) {
      const dayIndex = dragStart.day;
      const startTime = dragStart.time < dragEnd.time ? dragStart.time : dragEnd.time;
      const endTimeIndex = TIME_SLOTS.indexOf(dragStart.time > dragEnd.time ? dragStart.time : dragEnd.time);
      const endTime = TIME_SLOTS[endTimeIndex + 1] || TIME_SLOTS[endTimeIndex];
      
      // Add new slot or toggle existing
      const newSchedule = [...schedule];
      const day = newSchedule[dayIndex];
      
      if (day.isOff) {
        day.isOff = false;
      }
      
      // Add new slot
      day.slots.push({
        dayOfWeek: dayIndex,
        startTime,
        endTime,
        hasBreak: false,
        isAvailable: true,
      });
      
      // Merge overlapping slots
      day.slots = mergeOverlappingSlots(day.slots);
      setSchedule(newSchedule);
      setHasChanges(true);
    }
    
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  // Check if cell is in current drag selection
  const isInDragSelection = (dayOfWeek: number, time: string): boolean => {
    if (!isDragging || !dragStart || !dragEnd || dragStart.day !== dayOfWeek) return false;
    
    const startTime = dragStart.time < dragEnd.time ? dragStart.time : dragEnd.time;
    const endTime = dragStart.time > dragEnd.time ? dragStart.time : dragEnd.time;
    
    return time >= startTime && time <= endTime;
  };

  const handleToggleDay = (dayIndex: number) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].isOff = !newSchedule[dayIndex].isOff;
    
    if (newSchedule[dayIndex].isOff) {
      newSchedule[dayIndex].slots = [];
    } else {
      newSchedule[dayIndex].slots = [{
        dayOfWeek: newSchedule[dayIndex].dayOfWeek,
        startTime: "09:00",
        endTime: "17:00",
        hasBreak: true,
        breakStart: "12:00",
        breakEnd: "13:00",
        isAvailable: true,
      }];
    }
    
    setSchedule(newSchedule);
    setHasChanges(true);
  };

  const handleAddSlot = (dayIndex: number) => {
    const newSchedule = [...schedule];
    const lastSlot = newSchedule[dayIndex].slots[newSchedule[dayIndex].slots.length - 1];
    const startTime = lastSlot ? lastSlot.endTime : "09:00";
    const startMinutes = timeToMinutes(startTime);
    const endTime = minutesToTime(Math.min(startMinutes + 120, 22 * 60)); // 2 hours later, max 10 PM
    
    newSchedule[dayIndex].slots.push({
      dayOfWeek: newSchedule[dayIndex].dayOfWeek,
      startTime,
      endTime,
      hasBreak: false,
      isAvailable: true,
    });
    
    setSchedule(newSchedule);
    setHasChanges(true);
  };

  const handleRemoveSlot = async (dayIndex: number, slotIndex: number) => {
    const slot = schedule[dayIndex].slots[slotIndex];
    
    if (slot.id) {
      try {
        await deleteSlotMutation.mutateAsync(slot.id);
      } catch (error) {
        console.error("Error deleting slot:", error);
        return;
      }
    }
    
    const newSchedule = [...schedule];
    newSchedule[dayIndex].slots.splice(slotIndex, 1);
    
    if (newSchedule[dayIndex].slots.length === 0) {
      newSchedule[dayIndex].isOff = true;
    }
    
    setSchedule(newSchedule);
    setHasChanges(true);
  };

  const handleSlotChange = (
    dayIndex: number, 
    slotIndex: number, 
    field: keyof TimeSlot, 
    value: string | boolean
  ) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].slots[slotIndex] = {
      ...newSchedule[dayIndex].slots[slotIndex],
      [field]: value,
    };
    setSchedule(newSchedule);
    setHasChanges(true);
  };

  const handleApplyPreset = (preset: typeof SCHEDULE_PRESETS[0]) => {
    const newSchedule = DAYS_OF_WEEK.map(day => {
      const isWorkDay = preset.schedule.workDays.includes(day.value);
      return {
        day: day.name,
        shortDay: day.short,
        dayOfWeek: day.value,
        isOff: !isWorkDay,
        slots: isWorkDay ? [{
          dayOfWeek: day.value,
          startTime: preset.schedule.startTime,
          endTime: preset.schedule.endTime,
          hasBreak: preset.schedule.hasBreak || false,
          breakStart: preset.schedule.breakStart,
          breakEnd: preset.schedule.breakEnd,
          isAvailable: true,
        }] : [],
      };
    });
    
    setSchedule(newSchedule);
    setHasChanges(true);
    toast.success(`Applied "${preset.name}" schedule`);
  };

  const handleCopySchedule = () => {
    if (!copyFromDay) return;
    
    const sourceDay = schedule.find(day => day.day === copyFromDay);
    if (!sourceDay) return;
    
    const newSchedule = schedule.map(day => {
      if (day.day !== copyFromDay) {
        return {
          ...day,
          isOff: sourceDay.isOff,
          slots: sourceDay.slots.map(slot => ({
            ...slot,
            dayOfWeek: day.dayOfWeek,
            id: undefined,
          })),
        };
      }
      return day;
    });
    
    setSchedule(newSchedule);
    setHasChanges(true);
    setCopyFromDay("");
    toast.success(`Copied schedule from ${copyFromDay} to all days`);
  };

  const handleClearAll = () => {
    const newSchedule = schedule.map(day => ({
      ...day,
      isOff: true,
      slots: [],
    }));
    setSchedule(newSchedule);
    setHasChanges(true);
    toast.info("All availability cleared");
  };

  const handleSave = async () => {
    // Validate overlapping slots
    const hasOverlap = schedule.some((day) => {
      const slots = day.slots;
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          if (rangesOverlap(slots[i], slots[j])) {
            return true;
          }
        }
      }
      return false;
    });

    if (hasOverlap) {
      toast.error("Time slots overlap on the same day. Please adjust.");
      return;
    }

    // Validate break times
    const invalidBreak = schedule.some(day => 
      day.slots.some(slot => {
        if (slot.hasBreak) {
          if (!slot.breakStart || !slot.breakEnd) return true;
          const breakStart = timeToMinutes(slot.breakStart);
          const breakEnd = timeToMinutes(slot.breakEnd);
          const slotStart = timeToMinutes(slot.startTime);
          const slotEnd = timeToMinutes(slot.endTime);
          return breakStart < slotStart || breakEnd > slotEnd || breakStart >= breakEnd;
        }
        return false;
      })
    );

    if (invalidBreak) {
      toast.error("Invalid break time. Break must be within slot hours.");
      return;
    }

    try {
      const availabilityData = schedule.flatMap(day => 
        day.slots.map(slot => ({
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          hasBreak: slot.hasBreak,
          breakStart: slot.breakStart,
          breakEnd: slot.breakEnd,
          isAvailable: slot.isAvailable,
        }))
      );

      try {
        const validation = await doctorApi.validateAvailability(availabilityData);
        if (validation && validation.valid === false) {
          toast.error("Validation failed: availability conflicts detected.");
          return;
        }
      } catch {
        // Continue if validation endpoint not available
      }

      await updateAvailabilityMutation.mutateAsync(availabilityData);
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving availability:", error);
    }
  };

  const handleCancel = () => {
    if (availabilityData) {
      setSchedule(buildScheduleFromAvailability(availabilityData));
    } else {
      setSchedule(buildScheduleFromAvailability([]));
    }
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <p className="text-muted-foreground">Loading your availability...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6 text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <p className="text-red-800 dark:text-red-200 font-medium mb-2">Unable to load availability</p>
        <p className="text-red-600 dark:text-red-400 text-sm mb-4">Please try again later</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Weekly Availability</h3>
          <p className="text-muted-foreground mt-1">
            Set your available hours for patient consultations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {totalHours} hrs/week
          </Badge>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === 'grid' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors border-l border-border",
                viewMode === 'list' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="font-medium text-sm text-foreground">Quick Presets</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {SCHEDULE_PRESETS.map((preset) => (
            <TooltipProvider key={preset.name}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleApplyPreset(preset)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border bg-background hover:bg-muted hover:border-primary/50 transition-all text-center group"
                  >
                    <preset.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs font-medium text-foreground">{preset.name}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{preset.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </Card>

      {/* Tools Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Select value={copyFromDay} onValueChange={setCopyFromDay}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Copy from..." />
            </SelectTrigger>
            <SelectContent>
              {schedule.filter(d => !d.isOff).map(day => (
                <SelectItem key={day.day} value={day.day}>
                  {day.day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleCopySchedule}
            disabled={!copyFromDay}
            size="sm"
            variant="outline"
          >
            <Copy className="w-4 h-4 mr-1.5" />
            Copy to All
          </Button>
        </div>
        <Button
          onClick={handleClearAll}
          size="sm"
          variant="outline"
          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          Clear All
        </Button>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <Card className="p-4 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Grid Header */}
            <div className="grid grid-cols-8 gap-1 mb-2">
              <div className="text-xs font-medium text-muted-foreground p-2">Time</div>
              {DAYS_OF_WEEK.map((day) => (
                <div 
                  key={day.value} 
                  className={cn(
                    "text-center p-2 rounded-lg",
                    schedule[day.value].isOff 
                      ? "bg-muted/50 text-muted-foreground" 
                      : "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <div className="text-xs font-medium">{day.short}</div>
                  <button
                    onClick={() => handleToggleDay(day.value)}
                    className={cn(
                      "text-[10px] mt-0.5 transition-colors",
                      schedule[day.value].isOff 
                        ? "text-muted-foreground hover:text-foreground" 
                        : "text-primary/70 hover:text-primary"
                    )}
                  >
                    {schedule[day.value].isOff ? "Enable" : "Available"}
                  </button>
                </div>
              ))}
            </div>
            
            {/* Time Grid */}
            <div 
              className="grid grid-cols-8 gap-1 select-none"
              onMouseLeave={() => {
                if (isDragging) handleMouseUp();
              }}
            >
              {TIME_SLOTS.map((time, timeIndex) => (
                <>
                  {/* Time label */}
                  <div 
                    key={`time-${time}`}
                    className="text-[10px] text-muted-foreground p-1 text-right"
                  >
                    {timeIndex % 2 === 0 && formatTimeDisplay(time)}
                  </div>
                  
                  {/* Day cells */}
                  {DAYS_OF_WEEK.map((day) => {
                    const isAvailable = isTimeAvailable(day.value, time);
                    const isBreak = isBreakTime(day.value, time);
                    const isDayOff = schedule[day.value].isOff;
                    const inSelection = isInDragSelection(day.value, time);
                    
                    return (
                      <div
                        key={`${day.value}-${time}`}
                        className={cn(
                          "h-6 rounded-sm cursor-pointer transition-all border",
                          isDayOff && "bg-muted/30 border-transparent cursor-not-allowed",
                          !isDayOff && !isAvailable && !inSelection && "bg-background border-border/50 hover:border-primary/50 hover:bg-primary/5",
                          !isDayOff && isAvailable && !isBreak && "bg-green-500/80 dark:bg-green-600/80 border-green-600 dark:border-green-500",
                          !isDayOff && isBreak && "bg-amber-400/60 dark:bg-amber-600/60 border-amber-500 dark:border-amber-400",
                          inSelection && "bg-blue-500/60 border-blue-600 ring-1 ring-blue-400"
                        )}
                        onMouseDown={() => !isDayOff && handleMouseDown(day.value, time)}
                        onMouseEnter={() => !isDayOff && handleMouseEnter(day.value, time)}
                        onMouseUp={handleMouseUp}
                        title={
                          isDayOff ? "Day off" :
                          isBreak ? `Break time (${formatTimeDisplay(time)})` :
                          isAvailable ? `Available (${formatTimeDisplay(time)})` :
                          `Click & drag to add availability`
                        }
                      />
                    );
                  })}
                </>
              ))}
            </div>
            
            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-sm bg-green-500/80 dark:bg-green-600/80 border border-green-600" />
                <span className="text-xs text-muted-foreground">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-sm bg-amber-400/60 dark:bg-amber-600/60 border border-amber-500" />
                <span className="text-xs text-muted-foreground">Break</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-sm bg-muted/30 border border-transparent" />
                <span className="text-xs text-muted-foreground">Day Off</span>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5" />
                Click & drag to add time slots
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {schedule.map((daySchedule, dayIndex) => (
            <Card 
              key={daySchedule.day} 
              className={cn(
                "overflow-hidden transition-all",
                daySchedule.isOff && "opacity-60"
              )}
            >
              {/* Day Header */}
              <div className={cn(
                "flex items-center justify-between p-4",
                daySchedule.isOff ? "bg-muted/50" : "bg-primary/5"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm",
                    daySchedule.isOff 
                      ? "bg-muted text-muted-foreground" 
                      : "bg-primary text-primary-foreground"
                  )}>
                    {daySchedule.shortDay}
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{daySchedule.day}</h4>
                    <p className="text-xs text-muted-foreground">
                      {daySchedule.isOff 
                        ? "Not available" 
                        : `${daySchedule.slots.length} time slot${daySchedule.slots.length !== 1 ? 's' : ''}`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={!daySchedule.isOff}
                    onCheckedChange={() => handleToggleDay(dayIndex)}
                  />
                  {!daySchedule.isOff && (
                    <Button
                      onClick={() => handleAddSlot(dayIndex)}
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Slot
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Time Slots */}
              {!daySchedule.isOff && (
                <div className="p-4 space-y-3">
                  {daySchedule.slots.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No time slots configured</p>
                      <Button
                        onClick={() => handleAddSlot(dayIndex)}
                        size="sm"
                        variant="ghost"
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add your first slot
                      </Button>
                    </div>
                  ) : (
                    daySchedule.slots.map((slot, slotIndex) => (
                      <div 
                        key={slotIndex} 
                        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border border-border bg-background"
                      >
                        {/* Time Range */}
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Start</Label>
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => handleSlotChange(dayIndex, slotIndex, "startTime", e.target.value)}
                                className="block w-28 px-2 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                              />
                            </div>
                          </div>
                          
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">End</Label>
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => handleSlotChange(dayIndex, slotIndex, "endTime", e.target.value)}
                              className="block w-28 px-2 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                          </div>
                        </div>
                        
                        {/* Break Toggle */}
                        <div className="flex items-center gap-4 sm:border-l sm:border-border sm:pl-4">
                          <div className="flex items-center gap-2">
                            <Coffee className="w-4 h-4 text-amber-500" />
                            <Switch
                              checked={slot.hasBreak}
                              onCheckedChange={(checked) => handleSlotChange(dayIndex, slotIndex, "hasBreak", checked)}
                            />
                            <span className="text-sm text-muted-foreground">Break</span>
                          </div>
                          
                          {slot.hasBreak && (
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={slot.breakStart || ""}
                                onChange={(e) => handleSlotChange(dayIndex, slotIndex, "breakStart", e.target.value)}
                                placeholder="Start"
                                className="w-24 px-2 py-1 text-xs border border-border rounded bg-background text-foreground"
                              />
                              <span className="text-muted-foreground">-</span>
                              <input
                                type="time"
                                value={slot.breakEnd || ""}
                                onChange={(e) => handleSlotChange(dayIndex, slotIndex, "breakEnd", e.target.value)}
                                placeholder="End"
                                className="w-24 px-2 py-1 text-xs border border-border rounded bg-background text-foreground"
                              />
                            </div>
                          )}
                        </div>
                        
                        {/* Delete Button */}
                        <Button
                          onClick={() => handleRemoveSlot(dayIndex, slotIndex)}
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
              
              {/* Day Off State */}
              {daySchedule.isOff && (
                <div className="p-6 text-center text-muted-foreground">
                  <Moon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">This day is marked as unavailable</p>
                  <Button
                    onClick={() => handleToggleDay(dayIndex)}
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                  >
                    Enable availability
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Save/Cancel Actions */}
      {hasChanges && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border -mx-6 px-6 py-4 -mb-6 flex items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            You have unsaved changes
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-1.5" />
              Discard
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateAvailabilityMutation.isPending}
            >
              {updateAvailabilityMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Check className="w-4 h-4 mr-1.5" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
