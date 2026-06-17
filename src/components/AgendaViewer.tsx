import React, { useState, useEffect, useRef } from "react";
import { MeetingAgenda, AgendaItem } from "../types";
import { 
  Clock, Users, CheckSquare, ChevronRight, User, AlertCircle, 
  Play, Pause, RotateCcw, SkipForward, ArrowLeft, Printer, Calendar, Shield, Share2, Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AgendaViewerProps {
  agenda: MeetingAgenda;
  initialTime: number;
  onBack: () => void;
}

export default function AgendaViewer({ agenda, initialTime, onBack }: AgendaViewerProps) {
  const [totalTime, setTotalTime] = useState(initialTime);
  const [startTime, setStartTime] = useState("10:00");
  const [selectedStakeholder, setSelectedStakeholder] = useState<string | null>(null);
  
  // Interactive Live Facilitation Mode States
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Completed items in static list
  const [completedItemIds, setCompletedItemIds] = useState<Set<string>>(new Set());

  // Copy success indicator
  const [copied, setCopied] = useState(false);

  // Recalculate total weight
  const totalWeight = agenda.agendaItems.reduce((acc, item) => acc + item.timeWeight, 0);

  // Divide time into integer values matching exactly totalTime
  const allocateItemTimes = (): { [id: string]: number } => {
    if (agenda.agendaItems.length === 0) return {};
    
    const weights = agenda.agendaItems.map(item => item.timeWeight);
    const result: { [id: string]: number } = {};
    
    // Allocate raw base rounded floor
    let allocatedSum = 0;
    const itemsWithRemainder = agenda.agendaItems.map((item) => {
      const share = (item.timeWeight / totalWeight) * totalTime;
      const rounded = Math.max(1, Math.round(share));
      allocatedSum += rounded;
      return {
        id: item.id,
        rounded,
        remainder: share - rounded,
      };
    });

    // Check discrepancy
    const discrepancy = totalTime - allocatedSum;

    // Adjust discrepancy to nearest section to maintain precise total sum
    if (discrepancy !== 0) {
      if (discrepancy > 0) {
        // Distribute remaining minutes to elements with largest positive remainders
        const sorted = [...itemsWithRemainder].sort((a, b) => b.remainder - a.remainder);
        for (let i = 0; i < discrepancy; i++) {
          const target = sorted[i % sorted.length];
          target.rounded += 1;
        }
      } else {
        // Subtract minutes from elements with largest negative remainders (without going below 1)
        const sorted = [...itemsWithRemainder].sort((a, b) => a.remainder - b.remainder);
        let deficit = Math.abs(discrepancy);
        for (let i = 0; i < deficit; i++) {
          const target = sorted[i % sorted.length];
          if (target.rounded > 1) {
            target.rounded -= 1;
          }
        }
      }
    }

    // Map to result
    itemsWithRemainder.forEach(item => {
      result[item.id] = item.rounded;
    });

    return result;
  };

  const itemDurations = allocateItemTimes();

  // Compute actual start & end times based on selectedStartTime
  const getItemTimetable = (): { [id: string]: { start: string; end: string } } => {
    const timetable: { [id: string]: { start: string; end: string } } = {};
    const [startHour, startMin] = startTime.split(":").map(Number);
    let runningMinutes = startHour * 60 + startMin;

    agenda.agendaItems.forEach((item) => {
      const duration = itemDurations[item.id] || 0;
      
      const formatTime = (totalMins: number) => {
        const mins = totalMins % 60;
        const hours = Math.floor(totalMins / 60) % 24;
        const ampm = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 === 0 ? 12 : hours % 12;
        const displayMins = mins < 10 ? `0${mins}` : mins;
        return `${displayHours}:${displayMins} ${ampm}`;
      };

      const startText = formatTime(runningMinutes);
      runningMinutes += duration;
      const endText = formatTime(runningMinutes);

      timetable[item.id] = { start: startText, end: endText };
    });

    return timetable;
  };

  const itemTimetable = getItemTimetable();

  // Extract all unique stakeholders across all components
  const allStakeholders = Array.from(
    new Set(agenda.agendaItems.flatMap((item) => item.stakeholders))
  ).filter(Boolean);

  // Interactive Live Timer logic
  useEffect(() => {
    if (isLiveMode) {
      const activeItem = agenda.agendaItems[activeItemIndex];
      const durationMins = itemDurations[activeItem?.id] || 1;
      setSecondsRemaining(durationMins * 60);
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLiveMode, activeItemIndex]);

  useEffect(() => {
    if (isTimerRunning && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            triggerChime();
            // Auto advance or pause
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, secondsRemaining]);

  const triggerChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5 
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    } catch (e) {
      console.warn("AudioContext chime muted by browser autoplay restriction.");
    }
  };

  const formatTimerDigits = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    const formattedMins = mins < 10 ? `0${mins}` : mins;
    const formattedSecs = remSecs < 10 ? `0${remSecs}` : remSecs;
    return `${formattedMins}:${formattedSecs}`;
  };

  const handleToggleComplete = (itemId: string) => {
    const updated = new Set(completedItemIds);
    if (updated.has(itemId)) {
      updated.delete(itemId);
    } else {
      updated.add(itemId);
    }
    setCompletedItemIds(updated);
  };

  const copyAgendaToClipboard = () => {
    let text = `📅 Agenda: ${agenda.meetingTitle}\n🎯 Goal: ${agenda.meetingGoal}\n⏱️ Total Meeting Duration: ${totalTime} Minutes\n\n`;
    agenda.agendaItems.forEach(item => {
      const sched = itemTimetable[item.id];
      const dur = itemDurations[item.id];
      text += `--- [${sched.start} - ${sched.end}] (${dur} mins) ---\n`;
      text += `📍 Topic: ${item.title}\n`;
      text += `📝 Summary: ${item.summary}\n`;
      text += `👤 Stakeholders: ${item.stakeholders.join(", ")}\n`;
      text += `✅ Action Items:\n` + item.actionItems.map(act => `  • [ ] ${act}`).join("\n") + `\n\n`;
    });
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter sections by selected stakeholder
  const filteredItems = selectedStakeholder
    ? agenda.agendaItems.filter((item) => item.stakeholders.includes(selectedStakeholder))
    : agenda.agendaItems;

  return (
    <div className="space-y-6 md:space-y-8 print:p-0">
      
      {/* Navigation & Utilities */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <button
          onClick={onBack}
          className="mr-auto inline-flex items-center gap-2 px-4 py-2 border border-neutral-200 bg-white rounded-xl text-xs font-semibold text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Create New Agenda
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Print/Export buttons */}
          <button
            onClick={copyAgendaToClipboard}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 rounded-xl transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Copied Markdown
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-neutral-500" />
                Copy Markdown
              </>
            )}
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 rounded-xl transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-500" />
            Print Agenda
          </button>

          <button
            onClick={() => {
              setIsLiveMode(true);
              setActiveItemIndex(0);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-100 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            Live Facilitator Mode
          </button>
        </div>
      </div>

      {/* Live Facilitator Panel */}
      <AnimatePresence>
        {isLiveMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-indigo-950 text-white rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-indigo-950/20 print:hidden"
          >
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-indigo-5000/10 rounded-full blur-2xl"></div>
            
            <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
              <div className="space-y-2 flex-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-indigo-700/50 rounded-lg text-indigo-200">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                  Active Agenda Facilitator
                </span>
                <h3 className="text-xl md:text-2xl font-extrabold tracking-tight">
                  {agenda.agendaItems[activeItemIndex]?.title}
                </h3>
                <p className="text-sm text-indigo-200/90 max-w-2xl line-clamp-2">
                  {agenda.agendaItems[activeItemIndex]?.description}
                </p>
              </div>

              {/* Timer metrics */}
              <div className="flex flex-col items-center justify-center bg-indigo-900/60 hover:bg-indigo-900 border border-indigo-750 p-4 rounded-2xl min-w-[170px] text-center">
                <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-300 uppercase">
                  Time Remaining
                </span>
                <div className={`text-3xl font-bold font-mono tracking-tighter mt-1 ${secondsRemaining < 60 ? "text-rose-400 animate-pulse" : "text-white"}`}>
                  {formatTimerDigits(secondsRemaining)}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="p-1.5 bg-indigo-800 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      const dur = itemDurations[agenda.agendaItems[activeItemIndex].id] || 1;
                      setSecondsRemaining(dur * 60);
                    }}
                    className="p-1.5 bg-indigo-800 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (activeItemIndex < agenda.agendaItems.length - 1) {
                        setActiveItemIndex(prev => prev + 1);
                      } else {
                        setIsLiveMode(false);
                      }
                    }}
                    className="p-1.5 bg-indigo-800 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Pagination dots below facilitator */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-indigo-850">
              <div className="flex items-center gap-2">
                {agenda.agendaItems.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveItemIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === activeItemIndex ? "w-6 bg-white" : "w-2 bg-indigo-800"
                    }`}
                  />
                ))}
              </div>
              
              <button
                onClick={() => setIsLiveMode(false)}
                className="text-xs font-semibold text-indigo-300 hover:text-white transition-all cursor-pointer"
              >
                Close live player
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Settings sidebar + Agenda panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        
        {/* Settings Panel Dashboard Sidebar */}
        <div id="facilitation-planner-sidebar" className="lg:col-span-4 bg-white border border-neutral-200/80 rounded-2xl p-5 md:p-6 space-y-6 print:hidden">
          <div className="pb-4 border-b border-neutral-100">
            <h3 className="font-bold text-neutral-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Facilitation Planner
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Adjust parameters in real-time to fit your team schedule.
            </p>
          </div>

          {/* Interactive controls */}
          <div className="space-y-4">
            {/* Specified Agenda Total Duration Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-neutral-500">Specified Meeting Time:</span>
                <span className="text-neutral-800 font-bold font-mono">{totalTime} mins</span>
              </div>
              <input
                type="range"
                min={15}
                max={180}
                step={5}
                value={totalTime}
                onChange={(e) => setTotalTime(Number(e.target.value))}
                className="w-full accent-indigo-600 h-1.5 bg-neutral-100 rounded-lg cursor-pointer"
              />
            </div>

            {/* Start Time Picker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-500 block">
                Meeting Start Time:
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value || "10:00")}
                  className="w-full text-sm font-semibold p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                />
              </div>
            </div>
          </div>

          {/* Stakeholders Filter */}
          {allStakeholders.length > 0 && (
            <div className="space-y-3.5 pt-4 border-t border-neutral-100">
              <label className="text-xs font-bold text-neutral-600 block uppercase tracking-wider">
                Filter by Stakeholder
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedStakeholder(null)}
                  className={`px-3 py-1.5 text-xs font-semibold tracking-tight rounded-xl border transition-all cursor-pointer ${
                    selectedStakeholder === null
                      ? "bg-neutral-800 text-white border-neutral-800 shadow-sm"
                      : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  All Participants
                </button>
                {allStakeholders.map((person) => (
                  <button
                    key={person}
                    onClick={() => setSelectedStakeholder(person === selectedStakeholder ? null : person)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
                      person === selectedStakeholder
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white border-neutral-200 hover:border-neutral-300 text-neutral-600"
                    }`}
                  >
                    <User className="w-3 h-3 opacity-60" />
                    <span>{person}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Statistics */}
          <div className="space-y-3 pt-4 border-t border-neutral-100 bg-neutral-50/50 p-4 rounded-xl">
            <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">
              Meeting Overview
            </h4>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white border border-neutral-150 p-2.5 rounded-lg">
                <span className="block text-xs text-neutral-400 font-semibold mb-0.5">Sections</span>
                <span className="font-mono font-bold text-neutral-800 text-sm">{agenda.agendaItems.length}</span>
              </div>
              <div className="bg-white border border-neutral-150 p-2.5 rounded-lg">
                <span className="block text-xs text-neutral-400 font-semibold mb-0.5">Stakeholders</span>
                <span className="font-mono font-bold text-neutral-800 text-sm">{allStakeholders.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Agenda Output Sheet */}
        <div id="agenda-sheet" className="lg:col-span-8 bg-white border border-neutral-200/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-md shadow-neutral-100 print:border-none print:shadow-none print:p-0">
          
          {/* Header */}
          <div className="space-y-3 pb-6 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold font-mono tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full uppercase">
                Generated Meeting Agenda
              </span>
              <span className="hidden print:inline-block text-xs text-neutral-400 font-semibold">
                Start: {startTime} | Specified Duration: {totalTime} minutes
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900">
              {agenda.meetingTitle}
            </h1>
            
            {/* Goal Banner */}
            <div className="p-4 bg-neutral-50 border border-neutral-150 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 bg-indigo-500 h-full"></div>
              <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5" />
                Strategic Agenda Goal
              </h4>
              <p className="text-sm font-semibold text-neutral-700 leading-relaxed">
                {agenda.meetingGoal}
              </p>
            </div>
          </div>

          {/* Render List */}
          <div className="relative space-y-6">
            
            {/* Content list */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
                <h4 className="font-bold text-neutral-700 text-sm">No sections match criteria</h4>
                <p className="text-xs text-neutral-400 mt-1">Clear your filter to view full components.</p>
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const duration = itemDurations[item.id] || 0;
                const schedule = itemTimetable[item.id] || { start: "", end: "" };
                const isCompleted = completedItemIds.has(item.id);
                const isActiveInFacilitator = isLiveMode && idx === activeItemIndex;

                return (
                  <motion.div
                    key={item.id}
                    layoutId={`agenda-card-${item.id}`}
                    className={`group transition-all rounded-xl relative p-5 border ${
                      isActiveInFacilitator
                        ? "border-indigo-600 bg-indigo-50/10 shadow-md ring-1 ring-indigo-600/30"
                        : "border-neutral-200/90 bg-white hover:border-neutral-300 shadow-sm hover:shadow-md"
                    } ${isCompleted ? "opacity-60 bg-neutral-50/40" : ""}`}
                  >
                    
                    {/* Checkbox selector & timing banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      
                      {/* Checkbox button */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleComplete(item.id)}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all cursor-pointer ${
                            isCompleted
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-neutral-300 hover:border-neutral-400 text-transparent"
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        
                        <h3 className={`text-base font-bold tracking-tight text-neutral-800 ${
                          isCompleted ? "line-through text-neutral-400 font-normal" : ""
                        }`}>
                          {item.title}
                        </h3>
                      </div>

                      {/* Precise Timing Capsule */}
                      <span className="shrink-0 flex items-center bg-neutral-100 border border-neutral-200/80 p-1 px-2.5 rounded-lg gap-2 text-xs text-neutral-600 font-semibold self-start sm:self-center">
                        <Clock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <span className="font-mono text-neutral-800">{schedule.start} - {schedule.end}</span>
                        <span className="text-neutral-300 font-normal">|</span>
                        <span className="text-indigo-600 font-bold">{duration} mins</span>
                      </span>
                    </div>

                    {/* Section details */}
                    <div className="space-y-4 ml-8">
                      
                      <p className="text-sm text-neutral-500 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Document Context Extract */}
                      {item.summary && (
                        <div className="bg-neutral-50 border border-neutral-150 rounded-xl p-3.5 space-y-1.5">
                          <h4 className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                            Document Context Summary
                          </h4>
                          <p className="text-xs text-neutral-500 leading-relaxed italic">
                            "{item.summary}"
                          </p>
                        </div>
                      )}

                      {/* Stakeholders list */}
                      {item.stakeholders && item.stakeholders.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mr-1 flex items-center gap-1 shrink-0">
                            <Users className="w-3 h-3" /> Stakeholders:
                          </span>
                          {item.stakeholders.map((person) => (
                            <span
                              key={person}
                              onClick={() => setSelectedStakeholder(person)}
                              className="inline-flex items-center bg-neutral-100 text-neutral-600 px-2.5 py-1 text-xs rounded-lg border border-neutral-150 hover:bg-neutral-200 cursor-pointer transition-colors"
                            >
                              <User className="w-2.5 h-2.5 text-neutral-400 mr-1 shrink-0" />
                              {person}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action Items */}
                      {item.actionItems && item.actionItems.length > 0 && (
                        <div className="pt-2">
                          <h4 className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <CheckSquare className="w-3.5 h-3.5" /> Action Items / Deliverables
                          </h4>
                          <ul className="space-y-1.5 pl-1">
                            {item.actionItems.map((act, index) => (
                              <li key={index} className="flex items-start gap-2 text-xs text-neutral-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                <span className={isCompleted ? "line-through text-neutral-400" : ""}>{act}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    </div>
                  </motion.div>
                );
              })
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
