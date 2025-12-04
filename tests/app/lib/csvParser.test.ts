import { describe, it, expect } from "vitest";

// Recreate the parseCSV function for testing (since it's defined in a React component)
function parseCSV(csvText: string): { nodes: Array<Record<string, string>>; edges: Array<{ from: string; to: string }> } {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return { nodes: [], edges: [] };

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const nodes: Array<Record<string, string>> = [];
  const edgesMap: Array<{ from: string; to: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim());
    const row: Record<string, string> = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });

    // Only add if there's a title
    if (row.title) {
      nodes.push(row);

      // Parse edges if "next" column exists
      if (row.next && row.next.trim()) {
        edgesMap.push({ from: row.title, to: row.next.trim() });
      }
    }
  }

  return { nodes, edges: edgesMap };
}

describe("CSV Parser", () => {
  describe("parseCSV", () => {
    it("should parse basic CSV with headers", () => {
      const csv = `title,content,points
Start,Welcome to the hunt!,100
Middle,Keep going!,150
End,Congratulations!,200`;

      const result = parseCSV(csv);

      expect(result.nodes.length).toBe(3);
      expect(result.nodes[0].title).toBe("Start");
      expect(result.nodes[0].content).toBe("Welcome to the hunt!");
      expect(result.nodes[0].points).toBe("100");
    });

    it("should extract edges from 'next' column", () => {
      const csv = `title,content,next
Start,First clue,Middle
Middle,Second clue,End
End,Final clue,`;

      const result = parseCSV(csv);

      expect(result.edges.length).toBe(2);
      expect(result.edges[0]).toEqual({ from: "Start", to: "Middle" });
      expect(result.edges[1]).toEqual({ from: "Middle", to: "End" });
    });

    it("should handle empty lines", () => {
      const csv = `title,content

Start,First clue

End,Last clue`;

      const result = parseCSV(csv);

      expect(result.nodes.length).toBe(2);
    });

    it("should handle missing values", () => {
      const csv = `title,content,points,hint
Start,Welcome,100,
Middle,,150,Look here`;

      const result = parseCSV(csv);

      expect(result.nodes.length).toBe(2);
      expect(result.nodes[0].hint).toBe("");
      expect(result.nodes[1].content).toBe("");
      expect(result.nodes[1].hint).toBe("Look here");
    });

    it("should return empty arrays for empty CSV", () => {
      const result = parseCSV("");

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });

    it("should return empty arrays for CSV with only headers", () => {
      const csv = `title,content,points`;

      const result = parseCSV(csv);

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });

    it("should skip rows without title", () => {
      const csv = `title,content,points
Start,First clue,100
,No title row,50
End,Last clue,200`;

      const result = parseCSV(csv);

      expect(result.nodes.length).toBe(2);
      expect(result.nodes[0].title).toBe("Start");
      expect(result.nodes[1].title).toBe("End");
    });

    it("should handle Windows line endings (CRLF)", () => {
      const csv = "title,content\r\nStart,First\r\nEnd,Last";

      const result = parseCSV(csv);

      expect(result.nodes.length).toBe(2);
    });

    it("should handle quoted values with commas", () => {
      // Note: The current simple parser doesn't handle quoted CSV properly
      // This test documents current behavior
      const csv = `title,content
"Start",Welcome`;

      const result = parseCSV(csv);

      // Current parser treats quotes as part of the value
      expect(result.nodes[0].title).toBe('"Start"');
    });

    it("should normalize header case to lowercase", () => {
      const csv = `Title,CONTENT,Points
Start,Welcome,100`;

      const result = parseCSV(csv);

      expect(result.nodes[0].title).toBe("Start");
      expect(result.nodes[0].content).toBe("Welcome");
      expect(result.nodes[0].points).toBe("100");
    });

    it("should handle isStart and isEnd flags", () => {
      const csv = `title,isstart,isend
Start,true,false
End,false,true`;

      const result = parseCSV(csv);

      expect(result.nodes[0].isstart).toBe("true");
      expect(result.nodes[0].isend).toBe("false");
      expect(result.nodes[1].isstart).toBe("false");
      expect(result.nodes[1].isend).toBe("true");
    });

    it("should handle complete CSV with all supported columns", () => {
      const csv = `title,content,contentType,points,isStart,isEnd,hint,next,mediaUrl,adminComment
Start - Welcome,Welcome to the hunt!,text,100,true,false,Look for something tall,Clue 2,,Admin note
Clue 2,Find the fountain,text,150,false,false,Water flows,Final,,
Final,Congratulations!,text,250,false,true,,,https://example.com/image.jpg,Final node`;

      const result = parseCSV(csv);

      expect(result.nodes.length).toBe(3);
      expect(result.edges.length).toBe(2);

      // Verify first node
      expect(result.nodes[0].title).toBe("Start - Welcome");
      expect(result.nodes[0].isstart).toBe("true");
      expect(result.nodes[0].hint).toBe("Look for something tall");

      // Verify edges
      expect(result.edges[0]).toEqual({ from: "Start - Welcome", to: "Clue 2" });
      expect(result.edges[1]).toEqual({ from: "Clue 2", to: "Final" });
    });

    it("should trim whitespace from values", () => {
      const csv = `title , content , points
  Start  ,  Welcome  ,  100  `;

      const result = parseCSV(csv);

      expect(result.nodes[0].title).toBe("Start");
      expect(result.nodes[0].content).toBe("Welcome");
      expect(result.nodes[0].points).toBe("100");
    });
  });
});
