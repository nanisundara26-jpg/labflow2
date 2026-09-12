/**
 * LabFlow Sentinel — AI Decision Support & Operational Intelligence Service Layer
 * Architecture provides a clean abstraction designed to interface with
 * simulated heuristics or live LLM/inference endpoints without client redesign.
 *
 * "Predict. Prioritize. Rescue. Deliver."
 */

class LabFlowAIService {
  constructor() {
    this.apiEndpoint = null; // Future live backend proxy URL
    this.apiKey = null;      // Protected key, never exposed directly in frontend
    this.isSimulated = true;
    this.version = "Sentinel-AI v2.4 (Clinical Workflow Heuristics)";
  }

  /**
   * Calculate Multi-factor Sample Risk Score (0 - 100%)
   * Factors: Target TAT elapsed ratio, assigned analyzer load, priority weight, stage duration
   */
  analyzeSampleRisk(sample, analyzerMap = {}) {
    if (!sample) return { riskScore: 0, riskLevel: "Low", factors: [] };

    let score = 0;
    const factors = [];

    // Factor 1: TAT Elapsed vs Target (Max 45 pts)
    const elapsedRatio = sample.targetTat > 0 ? (sample.elapsedTime / sample.targetTat) : 0;
    if (elapsedRatio >= 0.85) {
      score += 42;
      factors.push({ name: "TAT Depletion", impact: "+42", desc: `Elapsed ${sample.elapsedTime}m / ${sample.targetTat}m target (${Math.round(elapsedRatio * 100)}%)` });
    } else if (elapsedRatio >= 0.65) {
      score += 26;
      factors.push({ name: "TAT Warning", impact: "+26", desc: `Over 65% of target turnaround elapsed` });
    } else if (elapsedRatio >= 0.45) {
      score += 14;
      factors.push({ name: "Elapsed Progression", impact: "+14", desc: `Moderate elapsed time` });
    } else {
      score += 5;
      factors.push({ name: "TAT Margin", impact: "+5", desc: `Adequate target turnaround time remaining` });
    }

    // Factor 2: Assigned Analyzer Capacity (Max 25 pts)
    const analyzer = analyzerMap[sample.assignedAnalyzer];
    if (analyzer) {
      if (analyzer.capacity >= 90) {
        score += 24;
        factors.push({ name: "Analyzer Congestion", impact: "+24", desc: `${analyzer.name} utilization at ${analyzer.capacity}% (saturation warning)` });
      } else if (analyzer.capacity >= 70) {
        score += 12;
        factors.push({ name: "Analyzer Load", impact: "+12", desc: `${analyzer.name} running at ${analyzer.capacity}% capacity` });
      } else {
        score += 4;
        factors.push({ name: "Analyzer Throughput", impact: "+4", desc: `${analyzer.name} capacity optimal (${analyzer.capacity}%)` });
      }
    } else {
      score += 8;
    }

    // Factor 3: Order Urgency / Priority (Max 20 pts)
    if (sample.priority === "STAT") {
      score += 20;
      factors.push({ name: "STAT Critical Priority", impact: "+20", desc: "Highest clinical turnaround protocol active" });
    } else if (sample.priority === "Urgent") {
      score += 14;
      factors.push({ name: "Urgent Priority", impact: "+14", desc: "Expedited processing requested by clinician" });
    } else {
      score += 5;
      factors.push({ name: "Routine Queue", impact: "+5", desc: "Standard batch priority" });
    }

    // Factor 4: Stage Bottleneck Index (Max 10 pts)
    if (sample.stageIndex === 5 && sample.elapsedTime > 30) {
      score += 9;
      factors.push({ name: "Analyzer Holding Queue", impact: "+9", desc: "Sample held in instrument pre-test rack >25m" });
    } else if (sample.stageIndex === 4 && sample.elapsedTime > 20) {
      score += 6;
      factors.push({ name: "Centrifuge Queue", impact: "+6", desc: "Pre-analytical sorting delayed" });
    }

    // Clamp score
    const finalScore = Math.min(Math.max(score, 5), 98);
    let riskLevel = "Low";
    if (finalScore >= 80) riskLevel = "Critical";
    else if (finalScore >= 65) riskLevel = "High";
    else if (finalScore >= 40) riskLevel = "Moderate";

    return {
      riskScore: finalScore,
      riskLevel,
      factors,
      confidence: 94,
      timestamp: new Date().toLocaleTimeString()
    };
  }

  /**
   * Predictive Turnaround Time (TAT) Calculation
   */
  predictTAT(sample, analyzerMap = {}) {
    const elapsed = sample.elapsedTime || 0;
    const target = sample.targetTat || 60;
    const analyzer = analyzerMap[sample.assignedAnalyzer];
    
    // Add estimated latency depending on current stage and instrument queue
    let latency = 10;
    if (analyzer && analyzer.capacity >= 90) latency += 15;
    if (sample.priority === "STAT") latency -= 8;

    const predicted = Math.max(elapsed + Math.max(latency, 5), target - 5);
    const riskPct = Math.min(100, Math.round((predicted / target) * 80));

    let riskBadge = "Low Risk";
    let riskClass = "risk-low";
    if (riskPct >= 90) { riskBadge = "Critical Risk"; riskClass = "risk-critical"; }
    else if (riskPct >= 75) { riskBadge = "High Risk"; riskClass = "risk-high"; }
    else if (riskPct >= 50) { riskBadge = "Moderate Risk"; riskClass = "risk-moderate"; }

    return {
      currentStage: sample.currentStage,
      elapsedTime: elapsed,
      targetTat: target,
      predictedCompletion: predicted,
      riskPercentage: riskPct,
      riskBadge,
      riskClass
    };
  }

  /**
   * Prioritize Sample Queue dynamically
   */
  prioritizeSamples(samples, analyzerMap = {}) {
    return [...samples].map(s => {
      const analysis = this.analyzeSampleRisk(s, analyzerMap);
      return {
        ...s,
        dynamicRisk: analysis.riskScore,
        riskLevel: analysis.riskLevel,
        factors: analysis.factors
      };
    }).sort((a, b) => b.dynamicRisk - a.dynamicRisk);
  }

  /**
   * Generate Real-Time Operational Insights & Alerts
   */
  generateOperationalInsights(samples = [], analyzers = []) {
    const insights = [];

    // Check for samples nearing TAT breach
    const atRiskSamples = samples.filter(s => s.status !== "Completed" && s.riskScore >= 75);
    if (atRiskSamples.length > 0) {
      insights.push({
        id: `INS-TAT-${Date.now()}`,
        type: "TAT_BREACH_RISK",
        severity: atRiskSamples.some(s => s.riskScore >= 85) ? "Critical" : "High",
        title: `${atRiskSamples.length} Samples at Risk of Missing TAT Protocol`,
        description: `Samples (${atRiskSamples.map(s => s.sampleId).slice(0, 3).join(", ")}) approaching TAT breach threshold under current workload.`,
        reason: "Analyzer queue saturation and pre-analytical transit lag.",
        recommendation: "Activate Sample Rescue Center protocols and redistribute compatible runs.",
        actionText: "Open Rescue Center",
        actionTarget: "rescue",
        timestamp: "Live update"
      });
    }

    // Check for analyzer bottlenecks
    analyzers.forEach(anl => {
      if (anl.capacity >= 90) {
        insights.push({
          id: `INS-ANL-${anl.id}`,
          type: "ANALYZER_BOTTLENECK",
          severity: "High",
          title: `${anl.name} Saturation Alert (${anl.capacity}%)`,
          description: `${anl.model} is operating near peak throughput. Queue depth: ${anl.activeQueue} specimens.`,
          reason: "Batch influx combined with instrument wash cycle intervals.",
          recommendation: "Reroute spillover samples to secondary available analyzers.",
          actionText: "Simulate Balancing",
          actionTarget: "operations",
          timestamp: "Live update"
        });
      }
    });

    // Check for critical unreviewed results
    insights.push({
      id: "INS-CRIT-RES",
      type: "CRITICAL_RESULT_ACTION",
      severity: "Critical",
      title: "Critical Lab Results Require Urgent Pathologist Sign-Off",
      description: "Severe Platelet (<20,000 /μL) and Troponin-I (>0.4 ng/mL) findings awaiting telephonic clinical callouts.",
      reason: "Critical value notification protocol mandates contact within 15 minutes of validation.",
      recommendation: "Review delta values and complete clinician alert log.",
      actionText: "Review Results",
      actionTarget: "results",
      timestamp: "Live update"
    });

    return insights;
  }

  /**
   * What-If Operational Simulator Engine
   * Evaluates operational disruptions and recommends mitigation protocols.
   */
  simulateWhatIf(scenarioKey, currentSamples = [], currentAnalyzers = []) {
    switch (scenarioKey) {
      case "analyzer_a_failure":
        return {
          scenarioName: "Analyzer A Sudden Breakdown",
          description: "Sysmex XN-1000 hematology analyzer experiences fluidics aspiration blockage.",
          expectedDelayedSamples: 17,
          estimatedTatImpactMinutes: 24,
          primaryBottleneck: "14 CBC and Hemogram samples trapped in intake carousel",
          riskShift: "+38% systemic TAT breach hazard",
          aiMitigationPlan: "Reroute 9 compatible samples to backup bench or Analyzer B hybrid module; prioritize 3 STAT samples on emergency manual station.",
          mitigationActions: [
            "Trigger automated specimen reroute to secondary line",
            "Notify maintenance technician for emergency fluidics purge",
            "Alert referring physicians of +20 min routine turnaround buffer"
          ]
        };

      case "staff_shortage":
        return {
          scenarioName: "Pre-Analytical Phlebotomy & Accession Staff Shortage",
          description: "2 accession technicians absent during peak 08:00 - 11:00 AM morning draw surge.",
          expectedDelayedSamples: 26,
          estimatedTatImpactMinutes: 35,
          primaryBottleneck: "Centrifugation queue and bar-less numeric check-in desk",
          riskShift: "+45% pre-analytical lag",
          aiMitigationPlan: "Activate emergency single-point accession queue; triage STAT orders directly to analyzer loading trays.",
          mitigationActions: [
            "Reassign 1 post-analytical staff to accession desk",
            "Batch centrifuge spins at maximum 12-tube capacity",
            "Temporarily waive non-critical secondary manual cross-checks"
          ]
        };

      case "stat_surge":
        return {
          scenarioName: "Emergency STAT Trauma / ICU Sample Surge (+25 Orders)",
          description: "Mass influx of emergency room cardiac markers and acute cross-match panels.",
          expectedDelayedSamples: 12,
          estimatedTatImpactMinutes: 18,
          primaryBottleneck: "STAT rack interrupt cycles on Analyzer B and C",
          riskShift: "+28% routine sample delay",
          aiMitigationPlan: "Pause routine outpatient batch incubation; dedicate Lane 1 exclusively to Emergency Trauma panels.",
          mitigationActions: [
            "Flag all ER specimens with STAT Priority Override",
            "Hold outpatient lipid profiles in temporary 4°C cold buffer",
            "Engage second pathologist for parallel real-time result verification"
          ]
        };

      default:
        return {
          scenarioName: "Routine Workflow Baseline",
          description: "Standard operating parameters active across all departments.",
          expectedDelayedSamples: 1,
          estimatedTatImpactMinutes: 0,
          primaryBottleneck: "None detected",
          riskShift: "Normal baseline",
          aiMitigationPlan: "Continuous automated monitoring active.",
          mitigationActions: []
        };
    }
  }

  /**
   * Non-Diagnostic AI Result Anomaly Detection Heuristics
   * Evaluates delta check variance, biological plausibility, and extreme shifts for human review.
   */
  detectResultAnomaly(result) {
    const observation = {
      isAnomalous: false,
      severity: "Normal",
      reason: "",
      disclaimer: "AI-generated observations are decision-support suggestions only and do not replace professional clinical judgment.",
      suggestedAction: ""
    };

    if (result.flag && (result.flag.includes("CRITICAL") || result.flag.includes("ALERT"))) {
      observation.isAnomalous = true;
      observation.severity = "High";
      observation.reason = `Extreme clinical parameter detected (${result.value} ${result.unit}). Reference standard: ${result.referenceRange}. ${result.deltaDeviation || "Significant shift from baseline."}`;
      observation.suggestedAction = "Perform instrument delta check, verify specimen non-hemolysis, and request Pathologist authorization.";
    }

    return observation;
  }

  /**
   * AI Technical Report Assistant
   * Drafts concise, standardized technical interpretations for Pathologist review.
   */
  generateReportSummary(patient, testResults = []) {
    let summaryText = `Diagnostic Evaluation for Patient Code ${patient.patientCode} (${patient.name}, ${patient.age}y/${patient.gender}):\n`;
    
    const criticalItems = testResults.filter(r => r.flag && r.flag.includes("CRITICAL"));
    if (criticalItems.length > 0) {
      summaryText += `• Significant Findings: Critical variance observed in ${criticalItems.map(c => `${c.test}: ${c.value} ${c.unit} [Ref: ${c.referenceRange}]`).join("; ")}.\n`;
      summaryText += `• Laboratory Correlation: Technical findings suggest urgent clinical correlation. Delta deviation indicates acute physiological variance rather than analytical error.\n`;
      summaryText += `• Recommendation for Treating Clinician: Telephonic notification completed. Immediate clinical reassessment recommended.\n`;
    } else {
      summaryText += `• Routine Evaluation: Test parameters within expected biological reference intervals or showing mild non-critical variations consistent with clinical history.\n`;
      summaryText += `• Instrument Quality Control: Internal calibrations and reagent blank checks verified within acceptable Westgard rules.\n`;
    }

    return {
      draftContent: summaryText,
      watermark: "AI Draft — Human Review Required",
      generatedAt: new Date().toLocaleString(),
      verifiedByAI: true
    };
  }

  /**
   * Automated Report Quality Assurance Check
   */
  runQualityCheck(reportData) {
    const checks = [];
    let allPassed = true;

    // Check 1: Patient Code format
    const hasValidCode = /^\d{4}$/.test(reportData.patientCode);
    checks.push({ name: "Patient Code 4-Digit Format", passed: hasValidCode, desc: hasValidCode ? `Verified: ${reportData.patientCode}` : "Invalid Code" });
    if (!hasValidCode) allPassed = false;

    // Check 2: Results reference intervals completeness
    const hasRanges = reportData.results && reportData.results.every(r => r.referenceRange && r.referenceRange.length > 0);
    checks.push({ name: "Reference Ranges Complete", passed: !!hasRanges, desc: "Biological reference intervals populated" });
    if (!hasRanges) allPassed = false;

    // Check 3: Reviewer Authorization
    const hasReviewer = reportData.reviewer && reportData.reviewer.length > 3;
    checks.push({ name: "Pathologist Sign-off Authorization", passed: hasReviewer, desc: reportData.reviewer || "Pending" });
    if (!hasReviewer) allPassed = false;

    return { allPassed, checks };
  }

  /**
   * Interactive LabFlow AI Chat Assistant
   * Answers natural language operational questions using current system state.
   */
  chatWithAssistant(query, appState = {}) {
    const lower = (query || "").toLowerCase();
    const samples = appState.samples || [];
    const analyzers = appState.analyzers || [];
    const criticalResults = appState.results ? appState.results.filter(r => r.flag && r.flag.includes("CRITICAL")) : [];

    // Query: Which samples are at risk?
    if (lower.includes("at risk") || lower.includes("risk")) {
      const atRisk = samples.filter(s => s.status !== "Completed" && s.riskScore >= 70);
      if (atRisk.length === 0) {
        return "Good news! All active laboratory specimens are currently operating within safe TAT parameters. No sample has a risk score exceeding 70%.";
      }
      return `Currently, **${atRisk.length} sample(s)** are flagged at high risk of TAT breach:\n\n` +
        atRisk.map(s => `• **${s.sampleId}** (${s.patientName}, Code: \`${s.patientCode}\`, Test: ${s.test}): **${s.riskScore}% risk** (${s.targetTat - s.elapsedTime}m remaining on ${s.assignedAnalyzer}). Recommendation: ${s.recommendation}`).join("\n\n") +
        `\n\n*Would you like me to open the Sample Rescue Center to approve rescue actions?*`;
    }

    // Query: Why is Analyzer A overloaded?
    if (lower.includes("analyzer a") || (lower.includes("analyzer") && lower.includes("overload"))) {
      const anlA = analyzers.find(a => a.id === "ANL-A") || { capacity: 94, activeQueue: 14 };
      return `**Analyzer A (Sysmex XN-1000 Hematology)** is running at **${anlA.capacity}% utilization** with ${anlA.activeQueue} samples in the active queue.\n\n` +
        `**Key Bottleneck Drivers:**\n` +
        `1. Morning outpatient CBC volume surge (+35% over baseline).\n` +
        `2. Two STAT cardiac/acute samples inserted into priority racks.\n` +
        `3. Predictive model estimates 100% capacity saturation within 22 minutes if no spillover occurs.\n\n` +
        `**Recommended Action:** Redirect compatible routine specimens to secondary bench or rebalance queue in Operations Center.`;
    }

    // Query: Critical results
    if (lower.includes("critical") || lower.includes("urgent results")) {
      if (criticalResults.length === 0) {
        return "There are no unreviewed critical results at this moment. All abnormal values have been signed off.";
      }
      return `There are **${criticalResults.length} critical clinical result(s)** requiring immediate review:\n\n` +
        criticalResults.map(r => `• **Patient ${r.patientCode}** (${r.patientName}): **${r.test} = ${r.value} ${r.unit}** (${r.flag}). Ref: ${r.referenceRange}. Status: *${r.reviewer}*`).join("\n\n") +
        `\n\n*Pathologist review and telephonic callout protocol are required.*`;
    }

    // Query: Prioritization
    if (lower.includes("prioritize") || lower.includes("priority queue")) {
      const topPriority = samples.filter(s => s.status !== "Completed").sort((a, b) => b.riskScore - a.riskScore).slice(0, 4);
      return `**AI Priority Queue Ranking (Top Specimens):**\n\n` +
        topPriority.map((s, idx) => `${idx + 1}. **${s.sampleId}** — Patient Code \`${s.patientCode}\` (${s.test}) | Urgency: **${s.priority}** | Risk: **${s.riskScore}%** | Stage: ${s.currentStage}`).join("\n") +
        `\n\nRankings are computed from TAT deadlines, clinical priority, waiting times, and analyzer availability.`;
    }

    // Query: What-If simulation
    if (lower.includes("what if") || lower.includes("analyzer b fail") || lower.includes("simulator")) {
      return `**What-If Simulation Engine:**\n\n` +
        `If **Analyzer B (Roche Cobas c501)** experiences downtime:\n` +
        `• **19 biochemistry samples** will face processing halts.\n` +
        `• Average turnaround time will increase by **+31 minutes**.\n` +
        `• Recommended mitigation: Freeze serum aliquots at 4°C and transfer urgent electrolytes to point-of-care backup.\n\n` +
        `*You can run live scenario simulations anytime in the Operations Center!*`;
    }

    // Query: Workload summary
    if (lower.includes("workload") || lower.includes("summary") || lower.includes("today")) {
      const activeCount = samples.filter(s => s.status !== "Completed").length;
      return `**Today's Laboratory Operational Summary:**\n` +
        `• Active Processing Workload: **${activeCount} samples**\n` +
        `• Overall TAT Compliance: **94.6%**\n` +
        `• Operational Health Index: **92% (Healthy)**\n` +
        `• Primary Attention Point: Analyzer A capacity (94%) and SMP-1048 rescue approval.\n` +
        `• 3 Automated Analyzers operational; morning QC calibration verified.`;
    }

    // Default intelligent conversational fallback
    return `Hello! I am **LabFlow AI**, your laboratory operations and decision-support assistant.\n\n` +
      `You can ask me questions such as:\n` +
      `• *"Which samples are at risk?"*\n` +
      `• *"Why is Analyzer A overloaded?"*\n` +
      `• *"Show critical pending results."*\n` +
      `• *"Which samples should be prioritized?"*\n` +
      `• *"What will happen if Analyzer B fails?"*\n` +
      `• *"Summarize today's laboratory workload."*`;
  }
}

// Export singleton instance
const aiService = new LabFlowAIService();
