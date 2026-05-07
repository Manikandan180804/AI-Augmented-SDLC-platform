import logging
import json
from typing import List, Dict, Any
from rag_engine import CodeRAG
# We will pass the call_ai function in the constructor, so we don't need to import main here.

logger = logging.getLogger("sdlc-agents")

# Since I can't easily import from main.py if it's not a package, 
# I'll define a simple agent caller here or rely on the one in main.py if I can.
# For simplicity, I'll define the prompts and logic here and integrate into main.py.

BUG_ANALYST_PROMPT = """You are a Bug Analyst. Your job is to understand the reported bug and identify the core issue.
Analyze the bug report and any provided context.
Return JSON: {"analysis": "...", "suspected_root_cause": "...", "search_queries": ["query1", "query2"]}"""

CODE_RESEARCHER_PROMPT = """You are a Code Researcher. Your job is to examine the code context provided by RAG and identify the specific files and lines where the bug might exist.
Return JSON: {"findings": "...", "relevant_files": [{"file": "...", "lines": "...", "reason": "..."}]}"""

BUG_FIXER_PROMPT = """You are a Bug Fixer. Based on the analysis and code research, propose a specific code fix.
Return JSON: {"fix_description": "...", "proposed_changes": [{"file": "...", "original_code": "...", "new_code": "..."}]}"""

QA_REVIEWER_PROMPT = """You are a QA Reviewer. Review the proposed fix for potential regressions or edge cases.
Return JSON: {"status": "approved|needs_revision", "comments": "...", "suggested_test_cases": []}"""

class MultiAgentBugFixer:
    def __init__(self, rag_engine: CodeRAG, call_ai_func):
        self.rag = rag_engine
        self.call_ai = call_ai_func

    async def fix_bug(self, bug_report: str):
        # 1. Triage / Analysis
        logger.info("Agent 1: Analyzing bug report...")
        mock_analysis = {
            "analysis": f"Detailed analysis of: '{bug_report[:50]}...'",
            "suspected_root_cause": "Likely a logic error in the processing flow related to this report.",
            "search_queries": [bug_report.split()[0] if bug_report else "error"]
        }
        analysis_res = self.call_ai(BUG_ANALYST_PROMPT, bug_report, mock_analysis)
        
        queries = analysis_res.get("search_queries", [bug_report])
        
        # 2. Research (RAG)
        logger.info("Agent 2: Researching code context...")
        context = ""
        for q in queries[:2]:
            context += self.rag.get_context(q)
            
        research_input = f"BUG REPORT: {bug_report}\n\nCODE CONTEXT:\n{context}"
        mock_research = {
            "findings": f"Found potential matches in the codebase for terms related to your bug report.",
            "relevant_files": [{"file": "main.py", "lines": "10-25", "reason": "High keyword density"}]
        }
        research_res = self.call_ai(CODE_RESEARCHER_PROMPT, research_input, mock_research)
        
        # 3. Fix
        logger.info("Agent 3: Proposing fix...")
        fix_input = f"ANALYSIS: {analysis_res}\n\nRESEARCH: {research_res}\n\nCONTEXT:\n{context}"
        mock_fix = {
            "fix_description": f"Proposed fix to address the core issue mentioned: {bug_report[:30]}...",
            "proposed_changes": [
                {
                    "file": "logic.py", 
                    "original_code": "# Old logic here", 
                    "new_code": f"# New logic to handle: {bug_report[:20]}"
                }
            ]
        }
        fix_res = self.call_ai(BUG_FIXER_PROMPT, fix_input, mock_fix)
        
        # 4. Review
        logger.info("Agent 4: Reviewing fix...")
        review_input = f"FIX: {fix_res}\n\nORIGINAL BUG: {bug_report}"
        mock_review = {
            "status": "approved", 
            "comments": f"The fix correctly addresses the bug: '{bug_report[:40]}'. Security checks passed."
        }
        review_res = self.call_ai(QA_REVIEWER_PROMPT, review_input, mock_review)
        
        return {
            "analysis": analysis_res,
            "research": research_res,
            "fix": fix_res,
            "review": review_res
        }
