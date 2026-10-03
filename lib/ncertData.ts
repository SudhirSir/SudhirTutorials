export interface QuestionStep {
  stepNumber: number;
  title: string;
  content: string;
  formula?: string;
}

export interface NcertQuestion {
  id: string;
  questionNumber: string;
  questionText: string;
  keyConcept?: string;
  diagramSvg?: string;
  steps: QuestionStep[];
  finalAnswer: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

export interface NcertExercise {
  id: string;
  exerciseNumber: string; // e.g. "Exercise 1.1"
  title?: string;
  description?: string;
  questions: NcertQuestion[];
}

export interface NcertChapter {
  id: string;
  chapterNumber: number;
  title: string;
  titleHindi: string;
  description: string;
  icon: string;
  color: string;
  summary: string;
  exercises: NcertExercise[];
}

export interface NcertSubject {
  id: string;
  name: string;
  code: string;
  icon: string;
  chapters: NcertChapter[];
}

export interface NcertClass {
  id: string;
  classNumber: number;
  label: string; // e.g. "Class 9"
  cbseBookTitle: string; // e.g. "Ganit Manjari / Mathematics NCERT"
  subjects: NcertSubject[];
}

export const NCERT_DATA: NcertClass[] = [
  // =================================================================
  // CLASS 6TH NCERT MATHEMATICS (GANITA PRAKASH / गणित प्रकाश Class 6)
  // =================================================================
  {
    id: "class-6",
    classNumber: 6,
    label: "Class 6th",
    cbseBookTitle: "NCERT Mathematics (Ganita Prakash / गणित प्रकाश Class 6)",
    subjects: [
      {
        id: "maths",
        name: "Mathematics (गणित)",
        code: "MATH-06",
        icon: "📐",
        chapters: [
          // Ch 1: Patterns in Mathematics
          {
            id: "ch-6-1",
            chapterNumber: 1,
            title: "Patterns in Mathematics",
            titleHindi: "गणित में पैटर्न",
            description: "Number patterns, arithmetic sequences, spatial patterns, and general terms.",
            icon: "🔢",
            color: "#ef4444",
            summary: "Recognize linear sequences and odd number sum properties.",
            exercises: [
              {
                id: "ex-6-1-1",
                exerciseNumber: "Exercise 1.1",
                title: "Number Patterns & Sequences",
                questions: [
                  {
                    id: "q-6-1-1-1",
                    questionNumber: "Question 1",
                    questionText: "Look at the pattern: 2, 5, 8, 11, ... Find the next two terms and state the rule.",
                    keyConcept: "Add 3 to previous term.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Find common difference",
                        content: "Difference = 5 - 2 = 3. Next terms: 11 + 3 = 14, 14 + 3 = 17."
                      }
                    ],
                    finalAnswer: "Next terms are 14 and 17. Rule: Add 3."
                  },
                  {
                    id: "q-6-1-1-2",
                    questionNumber: "Question 2",
                    questionText: "Find the sum of the first 5 odd natural numbers: 1 + 3 + 5 + 7 + 9.",
                    keyConcept: "Sum of first n odd natural numbers is \\( n^2 \\).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Apply formula for n = 5",
                        content: "\\( \\text{Sum} = 5^2 = 25 \\)."
                      }
                    ],
                    finalAnswer: "Sum = 25."
                  }
                ]
              }
            ]
          },
          // Ch 2: Lines and Angles
          {
            id: "ch-6-2",
            chapterNumber: 2,
            title: "Lines and Angles",
            titleHindi: "रेखाएँ और कोण",
            description: "Points, line segments, rays, lines, acute, right, obtuse, and straight angles.",
            icon: "📐",
            color: "#3b82f6",
            summary: "Acute < 90°, Right = 90°, Obtuse > 90°, Straight = 180°.",
            exercises: [
              {
                id: "ex-6-2-1",
                exerciseNumber: "Exercise 2.1",
                title: "Types of Angles & Lines",
                questions: [
                  {
                    id: "q-6-2-1-1",
                    questionNumber: "Question 1",
                    questionText: "Classify the following angles by measure: (i) 45°, (ii) 90°, (iii) 120°, (iv) 180°.",
                    keyConcept: "Classification of angles based on degrees.",
                    diagramSvg: `<svg viewBox="0 0 240 140" style="max-width:100%; height:auto;"><line x1="30" y1="110" x2="200" y2="110" stroke="#94a3b8" stroke-width="2"/><line x1="30" y1="110" x2="30" y2="20" stroke="#ef4444" stroke-width="2.5"/><text x="15" y="65" fill="#ef4444" font-size="10" font-weight="bold">90° Right Angle</text></svg>`,
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Classify each angle",
                        content: "(i) 45° < 90° -> Acute angle\n(ii) 90° -> Right angle\n(iii) 120° > 90° -> Obtuse angle\n(iv) 180° -> Straight angle."
                      }
                    ],
                    finalAnswer: "(i) Acute, (ii) Right, (iii) Obtuse, (iv) Straight."
                  }
                ]
              }
            ]
          },
          // Ch 3: Number Play
          {
            id: "ch-6-3",
            chapterNumber: 3,
            title: "Number Play",
            titleHindi: "संख्याओं का खेल",
            description: "Place value, large numbers up to 8 digits, Indian and International numeral systems, estimation.",
            icon: "🧮",
            color: "#10b981",
            summary: "Indian System: Crores, Lakhs, Thousands, Hundreds. International System: Millions, Thousands, Hundreds.",
            exercises: [
              {
                id: "ex-6-3-1",
                exerciseNumber: "Exercise 3.1",
                title: "Indian & International Numeral Systems",
                questions: [
                  {
                    id: "q-6-3-1-1",
                    questionNumber: "Question 1",
                    questionText: "Insert commas according to the Indian Numeral System and write in words: 98432701.",
                    keyConcept: "Commas after 3 digits from right, then after every 2 digits.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Place commas",
                        content: "9,84,32,701"
                      },
                      {
                        stepNumber: 2,
                        title: "Write in words",
                        content: "Nine crore eighty-four lakh thirty-two thousand seven hundred one."
                      }
                    ],
                    finalAnswer: "9,84,32,701 (Nine crore eighty-four lakh thirty-two thousand seven hundred one)."
                  }
                ]
              }
            ]
          },
          // Ch 4: Data Handling and Presentation
          {
            id: "ch-6-4",
            chapterNumber: 4,
            title: "Data Handling and Presentation",
            titleHindi: "आंकड़ों का प्रबंधन और प्रस्तुतीकरण",
            description: "Raw data, tally marks, pictographs, and bar graphs.",
            icon: "📊",
            color: "#8b5cf6",
            summary: "Represent survey counts visually using tally bars and pictograph icons.",
            exercises: [
              {
                id: "ex-6-4-1",
                exerciseNumber: "Exercise 4.1",
                title: "Tally Marks & Pictographs",
                questions: [
                  {
                    id: "q-6-4-1-1",
                    questionNumber: "Question 1",
                    questionText: "Represent the following student test scores using tally marks: 4, 3, 5, 4, 4, 5, 3.",
                    keyConcept: "Group tally marks in sets of 5.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Count frequencies",
                        content: "Score 3: || (2), Score 4: ||| (3), Score 5: || (2)."
                      }
                    ],
                    finalAnswer: "Score 3: 2; Score 4: 3; Score 5: 2."
                  }
                ]
              }
            ]
          },
          // Ch 5: Prime Time
          {
            id: "ch-6-5",
            chapterNumber: 5,
            title: "Prime Time",
            titleHindi: "अभाज्य संख्याएँ (Factors & Multiples)",
            description: "Factors, multiples, prime & composite numbers, divisibility rules, HCF and LCM.",
            icon: "🎲",
            color: "#f59e0b",
            summary: "HCF is Highest Common Factor. LCM is Lowest Common Multiple.",
            exercises: [
              {
                id: "ex-6-5-1",
                exerciseNumber: "Exercise 5.1",
                title: "Prime Factorization, HCF & LCM",
                questions: [
                  {
                    id: "q-6-5-1-1",
                    questionNumber: "Question 1",
                    questionText: "Find the LCM of 12 and 18.",
                    keyConcept: "\\( \\text{LCM} = 2^2 \\times 3^2 = 36 \\).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Prime factorize numbers",
                        content: "\\( 12 = 2^2 \\times 3 \\)\n\\( 18 = 2 \\times 3^2 \\)"
                      },
                      {
                        stepNumber: 2,
                        title: "Take highest power of each prime factor",
                        content: "\\( \\text{LCM} = 2^2 \\times 3^2 = 4 \\times 9 = 36 \\)."
                      }
                    ],
                    finalAnswer: "LCM(12, 18) = 36."
                  }
                ]
              }
            ]
          },
          // Ch 6: Perimeter and Area
          {
            id: "ch-6-6",
            chapterNumber: 6,
            title: "Perimeter and Area",
            titleHindi: "परिमाप और क्षेत्रफल",
            description: "Perimeter of rectangle and square, area of rectangle and square.",
            icon: "📐",
            color: "#ec4899",
            summary: "Perimeter of rectangle = 2(l+b). Area of square = side².",
            exercises: [
              {
                id: "ex-6-6-1",
                exerciseNumber: "Exercise 6.1",
                title: "Perimeter & Area Calculations",
                questions: [
                  {
                    id: "q-6-6-1-1",
                    questionNumber: "Question 1",
                    questionText: "Find the perimeter of a rectangle whose length is 12 cm and breadth is 8 cm.",
                    keyConcept: "\\( P = 2(l + b) \\).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Substitute values into formula",
                        content: "\\( P = 2(12 + 8) = 2(20) = 40 \\text{ cm} \\)."
                      }
                    ],
                    finalAnswer: "Perimeter = 40 cm."
                  }
                ]
              }
            ]
          },
          // Ch 7: Fractions
          {
            id: "ch-6-7",
            chapterNumber: 7,
            title: "Fractions",
            titleHindi: "भिन्न",
            description: "Proper, improper, mixed, and equivalent fractions; addition & subtraction of fractions.",
            icon: "🍕",
            color: "#06b6d4",
            summary: "Fraction p/q represents p equal parts out of q. Add fractions by finding common denominator.",
            exercises: [
              {
                id: "ex-6-7-1",
                exerciseNumber: "Exercise 7.1",
                title: "Fraction Operations",
                questions: [
                  {
                    id: "q-6-7-1-1",
                    questionNumber: "Question 1",
                    questionText: "Solve: \\( \\frac{2}{5} + \\frac{1}{3} \\).",
                    keyConcept: "LCM of denominators 5 and 3 is 15.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Convert to equivalent fractions with denominator 15",
                        content: "\\( \\frac{2 \\times 3}{15} + \\frac{1 \\times 5}{15} = \\frac{6 + 5}{15} = \\frac{11}{15} \\)."
                      }
                    ],
                    finalAnswer: "\\( \\frac{11}{15} \\)."
                  }
                ]
              }
            ]
          },
          // Ch 8: Playing with Constructions
          {
            id: "ch-6-8",
            chapterNumber: 8,
            title: "Playing with Constructions",
            titleHindi: "रचनाओं के साथ खेल",
            description: "Constructing line segments, perpendicular bisectors, and angle bisectors using ruler and compasses.",
            icon: "📏",
            color: "#84cc16",
            summary: "Perpendicular bisector divides line segment into two equal halves at right angle.",
            exercises: [
              {
                id: "ex-6-8-1",
                exerciseNumber: "Exercise 8.1",
                title: "Basic Geometric Constructions",
                questions: [
                  {
                    id: "q-6-8-1-1",
                    questionNumber: "Question 1",
                    questionText: "Draw a line segment AB of length 7.5 cm and construct its perpendicular bisector.",
                    keyConcept: "Draw arcs with radius > half length of AB from both endpoints A and B.",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Construct bisector",
                        content: "Set compass radius > 3.75 cm. Draw arcs above and below AB from A and B. Join intersection points to form perpendicular bisector."
                      }
                    ],
                    finalAnswer: "Perpendicular bisector constructed successfully."
                  }
                ]
              }
            ]
          },
          // Ch 9: Symmetry
          {
            id: "ch-6-9",
            chapterNumber: 9,
            title: "Symmetry",
            titleHindi: "सममिति",
            description: "Line of symmetry, symmetrical figures, and reflectional symmetry.",
            icon: "🦋",
            color: "#a855f7",
            summary: "A figure has symmetry if it can be folded so two halves match perfectly.",
            exercises: [
              {
                id: "ex-6-9-1",
                exerciseNumber: "Exercise 9.1",
                title: "Line Symmetry",
                questions: [
                  {
                    id: "q-6-9-1-1",
                    questionNumber: "Question 1",
                    questionText: "How many lines of symmetry does an equilateral triangle have?",
                    keyConcept: "An equilateral triangle has 3 equal sides and 3 lines of symmetry.",
                    diagramSvg: `<svg viewBox="0 0 200 180" style="max-width:100%; height:auto;"><polygon points="100,20 30,150 170,150" fill="none" stroke="#3b82f6" stroke-width="2.5"/><line x1="100" y1="20" x2="100" y2="150" stroke="#ef4444" stroke-width="2" stroke-dasharray="4"/><line x1="30" y1="150" x2="135" y2="85" stroke="#ef4444" stroke-width="2" stroke-dasharray="4"/><line x1="170" y1="150" x2="65" y2="85" stroke="#ef4444" stroke-width="2" stroke-dasharray="4"/></svg>`,
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Count symmetry lines",
                        content: "Each altitude passing from a vertex to the midpoint of opposite side forms a line of symmetry (3 lines)."
                      }
                    ],
                    finalAnswer: "3 lines of symmetry."
                  }
                ]
              }
            ]
          },
          // Ch 10: The Other Side of Zero (Integers)
          {
            id: "ch-6-10",
            chapterNumber: 10,
            title: "The Other Side of Zero (Integers)",
            titleHindi: "शून्य का दूसरा पक्ष (पूर्णांक)",
            description: "Negative numbers, representation of integers on number line, addition & subtraction of integers.",
            icon: "🔢",
            color: "#f97316",
            summary: "Integers = {..., -3, -2, -1, 0, 1, 2, 3, ...}. Addition of negative number moves left on number line.",
            exercises: [
              {
                id: "ex-6-10-1",
                exerciseNumber: "Exercise 10.1",
                title: "Integers on Number Line & Operations",
                questions: [
                  {
                    id: "q-6-10-1-1",
                    questionNumber: "Question 1",
                    questionText: "Evaluate: \\( (-7) + (-9) + 4 + 16 \\).",
                    keyConcept: "Group negative terms and positive terms separately.",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Combine negative integers",
                        content: "\\( (-7) + (-9) = -16 \\)"
                      },
                      {
                        stepNumber: 2,
                        title: "Combine positive integers",
                        content: "\\( 4 + 16 = 20 \\)"
                      },
                      {
                        stepNumber: 3,
                        title: "Add totals",
                        content: "\\( -16 + 20 = 4 \\)."
                      }
                    ],
                    finalAnswer: "Value = 4."
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },

  // =================================================================
  // CLASS 7TH NCERT MATHEMATICS (GANITA PRAKASH / गणित प्रकाश Class 7)
  // =================================================================
  {
    id: "class-7",
    classNumber: 7,
    label: "Class 7th",
    cbseBookTitle: "NCERT Mathematics (Ganita Prakash / गणित प्रकाश Class 7)",
    subjects: [
      {
        id: "maths",
        name: "Mathematics (गणित)",
        code: "MATH-07",
        icon: "📐",
        chapters: [
          // Ch 1: Integers
          {
            id: "ch-7-1",
            chapterNumber: 1,
            title: "Integers",
            titleHindi: "पूर्णांक",
            description: "Properties of addition & subtraction of integers, multiplication of negative integers, and division rules.",
            icon: "🔢",
            color: "#ef4444",
            summary: "Negative × Negative = Positive. Negative ÷ Positive = Negative.",
            exercises: [
              {
                id: "ex-7-1-1",
                exerciseNumber: "Exercise 1.1",
                title: "Integer Multiplication & Division",
                questions: [
                  {
                    id: "q-7-1-1-1",
                    questionNumber: "Question 1",
                    questionText: "Evaluate: (i) \\( (-30) \\div 10 \\), (ii) \\( 50 \\div (-5) \\), (iii) \\( (-36) \\div (-9) \\).",
                    keyConcept: "Division of integers with same signs gives positive; different signs give negative.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Evaluate Part (i)",
                        content: "\\( (-30) \\div 10 = -3 \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Evaluate Part (ii)",
                        content: "\\( 50 \\div (-5) = -10 \\)."
                      },
                      {
                        stepNumber: 3,
                        title: "Evaluate Part (iii)",
                        content: "\\( (-36) \\div (-9) = 4 \\)."
                      }
                    ],
                    finalAnswer: "(i) -3, (ii) -10, (iii) 4."
                  }
                ]
              }
            ]
          },
          // Ch 2: Fractions and Decimals
          {
            id: "ch-7-2",
            chapterNumber: 2,
            title: "Fractions and Decimals",
            titleHindi: "भिन्न एवं दशमलव",
            description: "Multiplication and division of fractions, multiplication and division of decimal numbers.",
            icon: "📐",
            color: "#3b82f6",
            summary: "Fraction division: a/b ÷ c/d = a/b × d/c.",
            exercises: [
              {
                id: "ex-7-2-1",
                exerciseNumber: "Exercise 2.1",
                title: "Fraction & Decimal Multiplication & Division",
                questions: [
                  {
                    id: "q-7-2-1-1",
                    questionNumber: "Question 1",
                    questionText: "Divide: \\( \\frac{7}{3} \\div 2 \\).",
                    keyConcept: "Multiply by reciprocal of divisor.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Multiply by reciprocal",
                        content: "\\( \\frac{7}{3} \\times \\frac{1}{2} = \\frac{7}{6} \\)."
                      }
                    ],
                    finalAnswer: "\\( \\frac{7}{6} \\)."
                  }
                ]
              }
            ]
          },
          // Ch 3: Data Handling
          {
            id: "ch-7-3",
            chapterNumber: 3,
            title: "Data Handling",
            titleHindi: "आंकड़ों का प्रबंधन",
            description: "Arithmetic mean, mode, median, double bar graphs, and probability basics.",
            icon: "📊",
            color: "#10b981",
            summary: "Mean = Sum/Count. Mode = Most frequent value. Median = Middle value of sorted data.",
            exercises: [
              {
                id: "ex-7-3-1",
                exerciseNumber: "Exercise 3.1",
                title: "Mean, Mode & Median",
                questions: [
                  {
                    id: "q-7-3-1-1",
                    questionNumber: "Question 1",
                    questionText: "Find the mean of the first 5 whole numbers (0, 1, 2, 3, 4).",
                    keyConcept: "First 5 whole numbers are 0, 1, 2, 3, 4.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Sum terms and divide by 5",
                        content: "\\( \\text{Mean} = \\frac{0 + 1 + 2 + 3 + 4}{5} = \\frac{10}{5} = 2 \\)."
                      }
                    ],
                    finalAnswer: "Mean = 2."
                  }
                ]
              }
            ]
          },
          // Ch 4: Simple Equations
          {
            id: "ch-7-4",
            chapterNumber: 4,
            title: "Simple Equations",
            titleHindi: "सरल समीकरण",
            description: "Setting up algebraic equations from statements and solving equations by transposing.",
            icon: "📈",
            color: "#8b5cf6",
            summary: "An equation is a condition on a variable showing equality of two expressions.",
            exercises: [
              {
                id: "ex-7-4-1",
                exerciseNumber: "Exercise 4.1",
                title: "Solving Linear Equations",
                questions: [
                  {
                    id: "q-7-4-1-1",
                    questionNumber: "Question 1",
                    questionText: "Solve: \\( 4p - 3 = 13 \\).",
                    keyConcept: "Transpose -3 to RHS.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Transpose -3",
                        content: "\\( 4p = 13 + 3 = 16 \\)"
                      },
                      {
                        stepNumber: 2,
                        title: "Divide by 4",
                        content: "\\( p = \\frac{16}{4} = 4 \\)."
                      }
                    ],
                    finalAnswer: "\\( p = 4 \\)."
                  }
                ]
              }
            ]
          },
          // Ch 5: Lines and Angles
          {
            id: "ch-7-5",
            chapterNumber: 5,
            title: "Lines and Angles",
            titleHindi: "रेखाएँ और कोण",
            description: "Complementary angles (sum = 90°), supplementary angles (sum = 180°), adjacent angles, linear pair, and parallel lines cut by a transversal.",
            icon: "📐",
            color: "#f59e0b",
            summary: "Complementary sum = 90°. Supplementary sum = 180°. Alternate interior angles are equal for parallel lines.",
            exercises: [
              {
                id: "ex-7-5-1",
                exerciseNumber: "Exercise 5.1",
                title: "Complementary & Supplementary Angles",
                questions: [
                  {
                    id: "q-7-5-1-1",
                    questionNumber: "Question 1",
                    questionText: "Find the complement of 65°.",
                    keyConcept: "Complementary angles add up to 90°.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Subtract from 90°",
                        content: "\\( 90^\\circ - 65^\\circ = 25^\\circ \\)."
                      }
                    ],
                    finalAnswer: "Complement = 25°."
                  }
                ]
              }
            ]
          },
          // Ch 6: The Triangle and Its Properties
          {
            id: "ch-7-6",
            chapterNumber: 6,
            title: "The Triangle and Its Properties",
            titleHindi: "त्रिभुज और उसके गुण",
            description: "Medians, altitudes, angle sum property = 180°, exterior angle theorem, and Pythagoras property.",
            icon: "🔺",
            color: "#ec4899",
            summary: "Exterior angle equals sum of interior opposite angles. Pythagoras: a² + b² = c² in right triangle.",
            exercises: [
              {
                id: "ex-7-6-1",
                exerciseNumber: "Exercise 6.1",
                title: "Exterior Angle & Pythagoras Theorem",
                questions: [
                  {
                    id: "q-7-6-1-1",
                    questionNumber: "Question 1",
                    questionText: "Find the value of unknown exterior angle \\( x \\) if interior opposite angles are 50° and 70°.",
                    keyConcept: "Exterior angle = Sum of interior opposite angles.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Apply Exterior Angle Theorem",
                        content: "\\( x = 50^\\circ + 70^\\circ = 120^\\circ \\)."
                      }
                    ],
                    finalAnswer: "\\( x = 120^\\circ \\)."
                  },
                  {
                    id: "q-7-6-1-2",
                    questionNumber: "Question 2",
                    questionText: "Right-angled triangle ABC is right-angled at C. If AC = 5 cm and BC = 12 cm, find AB.",
                    keyConcept: "Pythagoras Property: \\( AB^2 = AC^2 + BC^2 \\).",
                    diagramSvg: `<svg viewBox="0 0 240 160" style="max-width:100%; height:auto;"><polygon points="40,130 180,130 40,30" fill="none" stroke="#3b82f6" stroke-width="2.5"/><text x="25" y="140" fill="#ffffff" font-size="10">C (90°)</text><text x="190" y="140" fill="#ffffff" font-size="10">B</text><text x="25" y="25" fill="#ffffff" font-size="10">A</text><text x="15" y="80" fill="#10b981" font-size="10">5 cm</text><text x="100" y="145" fill="#10b981" font-size="10">12 cm</text><text x="110" y="70" fill="#ef4444" font-size="10" font-weight="bold">AB = 13 cm</text></svg>`,
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Apply Pythagoras Theorem",
                        content: "\\( AB = \\sqrt{AC^2 + BC^2} = \\sqrt{5^2 + 12^2} = \\sqrt{25 + 144} = \\sqrt{169} = 13 \\text{ cm} \\)."
                      }
                    ],
                    finalAnswer: "Hypotenuse AB = 13 cm."
                  }
                ]
              }
            ]
          },
          // Ch 7: Comparing Quantities
          {
            id: "ch-7-7",
            chapterNumber: 7,
            title: "Comparing Quantities",
            titleHindi: "राशियों की तुलना",
            description: "Converting ratios to percentages, profit & loss percentage, and Simple Interest formula SI = P·R·T / 100.",
            icon: "📈",
            color: "#06b6d4",
            summary: "Simple Interest formula \\( \\text{SI} = \\frac{P \\times R \\times T}{100} \\).",
            exercises: [
              {
                id: "ex-7-7-1",
                exerciseNumber: "Exercise 7.1",
                title: "Simple Interest & Percentages",
                questions: [
                  {
                    id: "q-7-7-1-1",
                    questionNumber: "Question 1",
                    questionText: "Find the Simple Interest on ₹5000 at 6% per annum for 2 years.",
                    keyConcept: "\\( \\text{SI} = \\frac{P \\times R \\times T}{100} \\).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Substitute values into SI formula",
                        content: "\\( \\text{SI} = \\frac{5000 \\times 6 \\times 2}{100} = 50 \\times 12 = ₹600 \\)."
                      }
                    ],
                    finalAnswer: "Simple Interest = ₹600."
                  }
                ]
              }
            ]
          },
          // Ch 8: Rational Numbers
          {
            id: "ch-7-8",
            chapterNumber: 8,
            title: "Rational Numbers",
            titleHindi: "परिमेय संख्याएँ",
            description: "Rational numbers on number line, positive & negative rational numbers, addition, subtraction, multiplication & division.",
            icon: "🔢",
            color: "#84cc16",
            summary: "Every integer and fraction is a rational number.",
            exercises: [
              {
                id: "ex-7-8-1",
                exerciseNumber: "Exercise 8.1",
                title: "Equivalent Rational Numbers",
                questions: [
                  {
                    id: "q-7-8-1-1",
                    questionNumber: "Question 1",
                    questionText: "Write four rational numbers equivalent to \\( -\\frac{2}{7} \\).",
                    keyConcept: "Multiply numerator and denominator by same non-zero integer.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Multiply by 2, 3, 4, 5",
                        content: "\\( -\\frac{4}{14}, -\\frac{6}{21}, -\\frac{8}{28}, -\\frac{10}{35} \\)."
                      }
                    ],
                    finalAnswer: "\\( -\\frac{4}{14}, -\\frac{6}{21}, -\\frac{8}{28}, -\\frac{10}{35} \\)."
                  }
                ]
              }
            ]
          },
          // Ch 9: Perimeter and Area
          {
            id: "ch-7-9",
            chapterNumber: 9,
            title: "Perimeter and Area",
            titleHindi: "परिमाप और क्षेत्रफल",
            description: "Area of parallelogram A = b·h, area of triangle A = (1/2)b·h, circumference C = 2πr, and area of circle A = πr².",
            icon: "📦",
            color: "#a855f7",
            summary: "Circumference C = 2πr. Area of circle = πr².",
            exercises: [
              {
                id: "ex-7-9-1",
                exerciseNumber: "Exercise 9.1",
                title: "Area of Parallelogram & Circle",
                questions: [
                  {
                    id: "q-7-9-1-1",
                    questionNumber: "Question 1",
                    questionText: "Find the area of a circle of radius 7 cm.",
                    keyConcept: "\\( \\text{Area} = \\pi r^2 \\) with \\( \\pi = \\frac{22}{7} \\).",
                    diagramSvg: `<svg viewBox="0 0 200 200" style="max-width:100%; height:auto;"><circle cx="100" cy="100" r="70" fill="rgba(168, 85, 247, 0.2)" stroke="#a855f7" stroke-width="2.5"/><line x1="100" y1="100" x2="170" y2="100" stroke="#ef4444" stroke-width="2"/><text x="130" y="90" fill="#ef4444" font-size="10" font-weight="bold">r = 7 cm</text></svg>`,
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Substitute r = 7 into formula",
                        content: "\\( \\text{Area} = \\frac{22}{7} \\times 7^2 = \\frac{22}{7} \\times 49 = 22 \\times 7 = 154 \\text{ cm}^2 \\)."
                      }
                    ],
                    finalAnswer: "Area of circle = \\( 154 \\text{ cm}^2 \\)."
                  }
                ]
              }
            ]
          },
          // Ch 10: Algebraic Expressions
          {
            id: "ch-7-10",
            chapterNumber: 10,
            title: "Algebraic Expressions",
            titleHindi: "बीजीय व्यंजक",
            description: "Terms, factors, coefficients, adding & subtracting algebraic expressions, and finding values of expressions.",
            icon: "🧮",
            color: "#f97316",
            summary: "Like terms have same algebraic factors and can be added or subtracted.",
            exercises: [
              {
                id: "ex-7-10-1",
                exerciseNumber: "Exercise 10.1",
                title: "Adding & Evaluating Expressions",
                questions: [
                  {
                    id: "q-7-10-1-1",
                    questionNumber: "Question 1",
                    questionText: "Evaluate \\( x^2 - 2x + 1 \\) for \\( x = 2 \\).",
                    keyConcept: "Substitute x = 2 into expression.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Substitute x = 2",
                        content: "\\( 2^2 - 2(2) + 1 = 4 - 4 + 1 = 1 \\)."
                      }
                    ],
                    finalAnswer: "Value = 1."
                  }
                ]
              }
            ]
          },
          // Ch 11: Exponents and Powers
          {
            id: "ch-7-11",
            chapterNumber: 11,
            title: "Exponents and Powers",
            titleHindi: "घातांक और घात",
            description: "Laws of exponents: a^m · a^n = a^(m+n), a^m / a^n = a^(m-n), and expressing numbers in scientific standard form.",
            icon: "🔢",
            color: "#14b8a6",
            summary: "Product law: a^m × a^n = a^(m+n). Quotient law: a^m / a^n = a^(m-n).",
            exercises: [
              {
                id: "ex-7-11-1",
                exerciseNumber: "Exercise 11.1",
                title: "Exponent Laws & Simplification",
                questions: [
                  {
                    id: "q-7-11-1-1",
                    questionNumber: "Question 1",
                    questionText: "Simplify: \\( (3^2)^3 \\div 3^4 \\).",
                    keyConcept: "Power of a power rule: \\( (a^m)^n = a^{mn} \\). Quotient rule: \\( a^m \\div a^n = a^{m-n} \\).",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Simplify power of power",
                        content: "\\( (3^2)^3 = 3^6 \\)"
                      },
                      {
                        stepNumber: 2,
                        title: "Apply quotient rule",
                        content: "\\( 3^6 \\div 3^4 = 3^{6-4} = 3^2 = 9 \\)."
                      }
                    ],
                    finalAnswer: "Value = 9."
                  }
                ]
              }
            ]
          },
          // Ch 12: Symmetry
          {
            id: "ch-7-12",
            chapterNumber: 12,
            title: "Symmetry",
            titleHindi: "सममिति",
            description: "Line of symmetry, rotational symmetry, and order of rotational symmetry.",
            icon: "🦋",
            color: "#6366f1",
            summary: "Rotational symmetry exists if shape looks identical after rotation by an angle < 360°.",
            exercises: [
              {
                id: "ex-7-12-1",
                exerciseNumber: "Exercise 12.1",
                title: "Rotational & Line Symmetry",
                questions: [
                  {
                    id: "q-7-12-1-1",
                    questionNumber: "Question 1",
                    questionText: "State the order of rotational symmetry for a square.",
                    keyConcept: "A square matches itself 4 times in one full 360° rotation (at 90°, 180°, 270°, 360°).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Determine rotational angle",
                        content: "Angle of rotation = \\( \\frac{360^\\circ}{4} = 90^\\circ \\)."
                      }
                    ],
                    finalAnswer: "Order of rotational symmetry = 4."
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  // =================================================================
  // CLASS 8TH NCERT MATHEMATICS (GANITA PRAKASH / गणित प्रकाश Class 8)
  // =================================================================
  {
    id: "class-8",
    classNumber: 8,
    label: "Class 8th",
    cbseBookTitle: "NCERT Mathematics (Ganita Prakash / गणित प्रकाश Class 8)",
    subjects: [
      {
        id: "maths",
        name: "Mathematics (गणित)",
        code: "MATH-08",
        icon: "📐",
        chapters: [
          // Ch 1: Rational Numbers
          {
            id: "ch-8-1",
            chapterNumber: 1,
            title: "Rational Numbers",
            titleHindi: "परिमेय संख्याएँ",
            description: "Properties of rational numbers: closure, commutativity, associativity, distributive law, additive & multiplicative identity and inverse.",
            icon: "🔢",
            color: "#ef4444",
            summary: "Master fundamental arithmetic properties of rational numbers in p/q form (q ≠ 0).",
            exercises: [
              {
                id: "ex-8-1-1",
                exerciseNumber: "Exercise 1.1",
                title: "Properties of Rational Numbers",
                questions: [
                  {
                    id: "q-8-1-1-1",
                    questionNumber: "Question 1",
                    questionText: "Name the property under multiplication used in each of the following:\n(i) \\( -\\frac{4}{5} \\times 1 = 1 \\times -\\frac{4}{5} = -\\frac{4}{5} \\)\n(ii) \\( -\\frac{13}{17} \\times -\\frac{2}{7} = -\\frac{2}{7} \\times -\\frac{13}{17} \\)\n(iii) \\( -\\frac{19}{29} \\times \\frac{29}{-19} = 1 \\)",
                    keyConcept: "1 is Multiplicative Identity; Commutative property: a × b = b × a; Multiplicative Inverse: a × (1/a) = 1.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Analyze Part (i)",
                        content: "1 is the multiplicative identity because multiplying any real number by 1 yields the number itself."
                      },
                      {
                        stepNumber: 2,
                        title: "Analyze Part (ii)",
                        content: "Commutative property under multiplication: changing order of multiplication does not change the product."
                      },
                      {
                        stepNumber: 3,
                        title: "Analyze Part (iii)",
                        content: "Multiplicative inverse (reciprocal) property: the product of a number and its reciprocal is 1."
                      }
                    ],
                    finalAnswer: "(i) 1 is the multiplicative identity\n(ii) Commutative property\n(iii) Multiplicative inverse property."
                  },
                  {
                    id: "q-8-1-1-2",
                    questionNumber: "Question 2",
                    questionText: "Tell what property allows you to compute \\( \\frac{1}{3} \\times \\left(6 \\times \\frac{4}{3}\\right) \\) as \\( \\left(\\frac{1}{3} \\times 6\\right) \\times \\frac{4}{3} \\).",
                    keyConcept: "Associative Property of Multiplication: \\( a \\times (b \\times c) = (a \\times b) \\times c \\).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Identify property",
                        content: "Groupings of terms in multiplication can be changed without altering the result: \\( a \\times (b \\times c) = (a \\times b) \\times c \\)."
                      }
                    ],
                    finalAnswer: "Associative property of multiplication."
                  }
                ]
              }
            ]
          },
          // Ch 2: Linear Equations in One Variable
          {
            id: "ch-8-2",
            chapterNumber: 2,
            title: "Linear Equations in One Variable",
            titleHindi: "एक चर वाले रैखिक समीकरण",
            description: "Solving linear equations having variables on one side or both sides, and solving algebraic word problems.",
            icon: "📈",
            color: "#3b82f6",
            summary: "Linear equations have degree 1. Solve by transposing terms to isolate the variable.",
            exercises: [
              {
                id: "ex-8-2-1",
                exerciseNumber: "Exercise 2.1",
                title: "Solving Linear Equations",
                questions: [
                  {
                    id: "q-8-2-1-1",
                    questionNumber: "Question 1",
                    questionText: "Solve the equation and check your result: \\( 3x = 2x + 18 \\).",
                    keyConcept: "Transpose variable terms to one side.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Transpose 2x to LHS",
                        content: "\\( 3x - 2x = 18 \\implies x = 18 \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Check result",
                        content: "LHS = \\( 3(18) = 54 \\)\nRHS = \\( 2(18) + 18 = 36 + 18 = 54 \\) (Verified)."
                      }
                    ],
                    finalAnswer: "\\( x = 18 \\)."
                  },
                  {
                    id: "q-8-2-1-2",
                    questionNumber: "Question 2",
                    questionText: "Solve the equation: \\( 5t - 3 = 3t - 5 \\).",
                    keyConcept: "Group variable terms on LHS and constants on RHS.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Transpose 3t to LHS and -3 to RHS",
                        content: "\\( 5t - 3t = -5 + 3 \\)"
                      },
                      {
                        stepNumber: 2,
                        title: "Simplify",
                        content: "\\( 2t = -2 \\implies t = \\frac{-2}{2} = -1 \\)."
                      }
                    ],
                    finalAnswer: "\\( t = -1 \\)."
                  },
                  {
                    id: "q-8-2-1-3",
                    questionNumber: "Question 3",
                    questionText: "Solve the equation: \\( \\frac{x}{3} + 1 = \\frac{7}{15} \\).",
                    keyConcept: "Isolate fraction term first.",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Transpose 1 to RHS",
                        content: "\\( \\frac{x}{3} = \\frac{7}{15} - 1 = \\frac{7 - 15}{15} = -\\frac{8}{15} \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Multiply both sides by 3",
                        content: "\\( x = -\\frac{8}{15} \\times 3 = -\\frac{8}{5} \\)."
                      }
                    ],
                    finalAnswer: "\\( x = -\\frac{8}{5} \\)."
                  }
                ]
              }
            ]
          },
          // Ch 3: Understanding Quadrilaterals
          {
            id: "ch-8-3",
            chapterNumber: 3,
            title: "Understanding Quadrilaterals",
            titleHindi: "चतुर्भुजों को समझना",
            description: "Polygons, interior & exterior angle sum theorems, properties of parallelogram, rhombus, rectangle, square, and kite.",
            icon: "📐",
            color: "#10b981",
            summary: "Interior angle sum = (n-2)×180°. Exterior angle sum = 360°. Parallelogram opposite sides and angles are equal.",
            exercises: [
              {
                id: "ex-8-3-1",
                exerciseNumber: "Exercise 3.1",
                title: "Polygon Angle Sum Theorems",
                questions: [
                  {
                    id: "q-8-3-1-1",
                    questionNumber: "Question 1",
                    questionText: "Find the sum of interior angles of a convex polygon with 7 sides (heptagon).",
                    keyConcept: "Angle sum formula for n-sided polygon: \\( S = (n - 2) \\times 180^\\circ \\).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Substitute n = 7 into formula",
                        content: "\\( S = (7 - 2) \\times 180^\\circ = 5 \\times 180^\\circ = 900^\\circ \\)."
                      }
                    ],
                    finalAnswer: "Sum of interior angles = \\( 900^\\circ \\)."
                  },
                  {
                    id: "q-8-3-1-2",
                    questionNumber: "Question 2",
                    questionText: "Find the angle measure \\( x \\) in a quadrilateral having interior angles \\( 50^\\circ, 130^\\circ, 120^\\circ, x \\).",
                    keyConcept: "Sum of angles of a quadrilateral is \\( 360^\\circ \\).",
                    diagramSvg: `<svg viewBox="0 0 240 160" style="max-width:100%; height:auto;"><polygon points="40,130 180,140 210,40 70,30" fill="none" stroke="#3b82f6" stroke-width="2.5"/><text x="45" y="115" fill="#ef4444" font-size="10">50°</text><text x="150" y="125" fill="#10b981" font-size="10">130°</text><text x="175" y="55" fill="#f59e0b" font-size="10">120°</text><text x="75" y="50" fill="#ef4444" font-size="11" font-weight="bold">x</text></svg>`,
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Sum four interior angles",
                        content: "\\( 50^\\circ + 130^\\circ + 120^\\circ + x = 360^\\circ \\)"
                      },
                      {
                        stepNumber: 2,
                        title: "Solve for x",
                        content: "\\( 300^\\circ + x = 360^\\circ \\implies x = 360^\\circ - 300^\\circ = 60^\\circ \\)."
                      }
                    ],
                    finalAnswer: "\\( x = 60^\\circ \\)."
                  }
                ]
              },
              {
                id: "ex-8-3-2",
                exerciseNumber: "Exercise 3.2",
                title: "Exterior Angles of Regular Polygons",
                questions: [
                  {
                    id: "q-8-3-2-1",
                    questionNumber: "Question 1",
                    questionText: "Find the measure of each exterior angle of a regular polygon of 9 sides.",
                    keyConcept: "Sum of exterior angles of any polygon = \\( 360^\\circ \\). Each exterior angle of regular n-gon = \\( \\frac{360^\\circ}{n} \\).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Calculate exterior angle",
                        content: "\\( \\text{Exterior Angle} = \\frac{360^\\circ}{9} = 40^\\circ \\)."
                      }
                    ],
                    finalAnswer: "Each exterior angle = \\( 40^\\circ \\)."
                  }
                ]
              }
            ]
          },
          // Ch 4: Data Handling
          {
            id: "ch-8-4",
            chapterNumber: 4,
            title: "Data Handling",
            titleHindi: "आंकड़ों का प्रबंधन",
            description: "Grouping data, frequency distribution tables, bar graphs, pie charts (circle graphs), and basic probability concepts.",
            icon: "📊",
            color: "#8b5cf6",
            summary: "Pie chart displays data in sector angles: \\( \\text{Central Angle} = \\frac{\\text{Value}}{\\text{Total}} \\times 360^\\circ \\).",
            exercises: [
              {
                id: "ex-8-4-1",
                exerciseNumber: "Exercise 4.1",
                title: "Pie Charts & Frequency Graphs",
                questions: [
                  {
                    id: "q-8-4-1-1",
                    questionNumber: "Question 1",
                    questionText: "A survey was made to find the type of music preferred by 200 young people. If 20% prefer classical music, how many people prefer classical music?",
                    keyConcept: "\\( \\text{Number of people} = \\text{Total} \\times \\frac{\\text{Percentage}}{100} \\).",
                    diagramSvg: `<svg viewBox="0 0 200 200" style="max-width:100%; height:auto;"><circle cx="100" cy="100" r="70" fill="none" stroke="#3b82f6" stroke-width="2"/><path d="M 100 100 L 170 100 A 70 70 0 0 0 121 33 Z" fill="rgba(239, 68, 68, 0.4)" stroke="#ef4444" stroke-width="2"/><text x="125" y="75" fill="#ef4444" font-size="10" font-weight="bold">Classical (20%)</text><circle cx="100" cy="100" r="4" fill="#ffffff"/></svg>`,
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Calculate count",
                        content: "\\( \\text{Count} = 200 \\times \\frac{20}{100} = 40 \\text{ people} \\)."
                      }
                    ],
                    finalAnswer: "40 people prefer classical music."
                  }
                ]
              }
            ]
          },
          // Ch 5: Squares and Square Roots
          {
            id: "ch-8-5",
            chapterNumber: 5,
            title: "Squares and Square Roots",
            titleHindi: "वर्ग और वर्गमूल",
            description: "Square numbers, Pythagorean triplets, finding square root by prime factorization and long division method.",
            icon: "🧮",
            color: "#f59e0b",
            summary: "Square root \\( \\sqrt{N} \\) is the number whose square equals N. Division method handles large numbers.",
            exercises: [
              {
                id: "ex-8-5-1",
                exerciseNumber: "Exercise 5.1",
                title: "Square Numbers & Prime Factorization",
                questions: [
                  {
                    id: "q-8-5-1-1",
                    questionNumber: "Question 1",
                    questionText: "What will be the unit digit of the square of 81?",
                    keyConcept: "Unit digit of square depends solely on unit digit of the number.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Check unit digit of 81",
                        content: "Unit digit of 81 is 1. Since \\( 1^2 = 1 \\), unit digit of \\( 81^2 \\) is 1."
                      }
                    ],
                    finalAnswer: "Unit digit = 1."
                  },
                  {
                    id: "q-8-5-1-2",
                    questionNumber: "Question 2",
                    questionText: "Find the square root of 6400 using prime factorization.",
                    keyConcept: "Pair identical prime factors.",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Prime factorize 6400",
                        content: "\\( 6400 = 2^8 \\times 5^2 \\)"
                      },
                      {
                        stepNumber: 2,
                        title: "Take one factor from each pair",
                        content: "\\( \\sqrt{6400} = 2^4 \\times 5 = 16 \\times 5 = 80 \\)."
                      }
                    ],
                    finalAnswer: "\\( \\sqrt{6400} = 80 \\)."
                  }
                ]
              },
              {
                id: "ex-8-5-2",
                exerciseNumber: "Exercise 5.2",
                title: "Square Roots by Long Division Method",
                questions: [
                  {
                    id: "q-8-5-2-1",
                    questionNumber: "Question 1",
                    questionText: "Find the square root of 529 using long division method.",
                    keyConcept: "Group digits into pairs from right: 5, 29.",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Find largest square ≤ 5",
                        content: "\\( 2^2 = 4 \\le 5 \\). Remainder = 1. Quotient digit = 2."
                      },
                      {
                        stepNumber: 2,
                        title: "Bring down pair 29 to make 129",
                        content: "Double current quotient: 2 × 2 = 4. Find digit x such that (4x × x) ≤ 129.\n\\( 43 \\times 3 = 129 \\)."
                      }
                    ],
                    finalAnswer: "\\( \\sqrt{529} = 23 \\)."
                  }
                ]
              }
            ]
          },
          // Ch 6: Cubes and Cube Roots
          {
            id: "ch-8-6",
            chapterNumber: 6,
            title: "Cubes and Cube Roots",
            titleHindi: "घन और घनमूल",
            description: "Cube numbers, prime factorization of cubes, and finding cube roots.",
            icon: "🎲",
            color: "#ec4899",
            summary: "Cube of a number \\( n^3 = n \\times n \\times n \\). Prime factors of perfect cubes occur in triplets.",
            exercises: [
              {
                id: "ex-8-6-1",
                exerciseNumber: "Exercise 6.1",
                title: "Perfect Cubes & Triplets",
                questions: [
                  {
                    id: "q-8-6-1-1",
                    questionNumber: "Question 1",
                    questionText: "Find the smallest number by which 256 must be multiplied to obtain a perfect cube.",
                    keyConcept: "Prime factors must form complete triplets of 3.",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Prime factorize 256",
                        content: "\\( 256 = 2 \\times 2 \\times 2 \\times 2 \\times 2 \\times 2 \\times 2 \\times 2 = (2^3) \\times (2^3) \\times (2^2) \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Determine missing factors",
                        content: "\\( 2^2 \\) needs one more factor of 2 to complete a triplet."
                      }
                    ],
                    finalAnswer: "Smallest multiplier = 2."
                  },
                  {
                    id: "q-8-6-1-2",
                    questionNumber: "Question 2",
                    questionText: "Find the cube root of 1728 by prime factorization.",
                    keyConcept: "\\( \\sqrt[3]{a^3 b^3} = a \\times b \\).",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Prime factorize 1728",
                        content: "\\( 1728 = 2^6 \\times 3^3 = (2^3) \\times (2^3) \\times (3^3) \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Take one factor from each triplet",
                        content: "\\( \\sqrt[3]{1728} = 2 \\times 2 \\times 3 = 12 \\)."
                      }
                    ],
                    finalAnswer: "\\( \\sqrt[3]{1728} = 12 \\)."
                  }
                ]
              }
            ]
          },
          // Ch 7: Comparing Quantities
          {
            id: "ch-8-7",
            chapterNumber: 7,
            title: "Comparing Quantities",
            titleHindi: "राशियों की तुलना",
            description: "Ratios, percentages, profit & loss, discount, sales tax / GST, simple interest & compound interest formula A = P(1 + r/100)^n.",
            icon: "📈",
            color: "#06b6d4",
            summary: "Discount = MP - SP. Compound Interest formula \\( A = P\\left(1 + \\frac{r}{100}\\right)^n \\).",
            exercises: [
              {
                id: "ex-8-7-1",
                exerciseNumber: "Exercise 7.1",
                title: "Ratios, Percentages & Discounts",
                questions: [
                  {
                    id: "q-8-7-1-1",
                    questionNumber: "Question 1",
                    questionText: "An item marked at ₹840 is sold for ₹714. Find the discount and discount percentage.",
                    keyConcept: "Discount = Marked Price (MP) - Selling Price (SP). Discount % = (Discount / MP) × 100.",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Calculate discount amount",
                        content: "\\( \\text{Discount} = 840 - 714 = ₹126 \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Calculate discount percentage",
                        content: "\\( \\text{Discount \\%} = \\frac{126}{840} \\times 100 = 15\\% \\)."
                      }
                    ],
                    finalAnswer: "Discount = ₹126, Discount percentage = 15%."
                  }
                ]
              },
              {
                id: "ex-8-7-2",
                exerciseNumber: "Exercise 7.2",
                title: "Compound Interest Formula",
                questions: [
                  {
                    id: "q-8-7-2-1",
                    questionNumber: "Question 1",
                    questionText: "Calculate the amount and compound interest on ₹10,000 for 2 years at 10% per annum compounded annually.",
                    keyConcept: "Compound Amount formula: \\( A = P\\left(1 + \\frac{r}{100}\\right)^n \\), \\( \\text{CI} = A - P \\).",
                    difficulty: "Hard",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Calculate total Amount A",
                        content: "\\( A = 10000 \\left(1 + \\frac{10}{100}\\right)^2 = 10000 \\times (1.1)^2 = 10000 \\times 1.21 = ₹12,100 \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Calculate Compound Interest CI",
                        content: "\\( \\text{CI} = 12100 - 10000 = ₹2,100 \\)."
                      }
                    ],
                    finalAnswer: "Amount = ₹12,100, Compound Interest = ₹2,100."
                  }
                ]
              }
            ]
          },
          // Ch 8: Algebraic Expressions and Identities
          {
            id: "ch-8-8",
            chapterNumber: 8,
            title: "Algebraic Expressions and Identities",
            titleHindi: "बीजीय व्यंजक एवं सर्वसमिकाएँ",
            description: "Addition, subtraction, multiplication of monomials & polynomials, standard algebraic identities (a+b)², (a-b)², a²-b².",
            icon: "📐",
            color: "#84cc16",
            summary: "Standard Identities: (a+b)² = a²+2ab+b², (a-b)² = a²-2ab+b², (a+b)(a-b) = a²-b².",
            exercises: [
              {
                id: "ex-8-8-1",
                exerciseNumber: "Exercise 8.1",
                title: "Polynomial Operations & Identities",
                questions: [
                  {
                    id: "q-8-8-1-1",
                    questionNumber: "Question 1",
                    questionText: "Use the identity \\( (a + b)^2 = a^2 + 2ab + b^2 \\) to evaluate \\( (x + 3)(x + 3) \\).",
                    keyConcept: "\\( (x + 3)^2 = x^2 + 2(x)(3) + 3^2 \\).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Apply Identity",
                        content: "\\( (x + 3)^2 = x^2 + 6x + 9 \\)."
                      }
                    ],
                    finalAnswer: "\\( x^2 + 6x + 9 \\)."
                  },
                  {
                    id: "q-8-8-1-2",
                    questionNumber: "Question 2",
                    questionText: "Evaluate \\( 103 \\times 104 \\) using the identity \\( (x + a)(x + b) = x^2 + (a + b)x + ab \\).",
                    keyConcept: "Express 103 as (100 + 3) and 104 as (100 + 4).",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Substitute x = 100, a = 3, b = 4 into formula",
                        content: "\\( (100 + 3)(100 + 4) = 100^2 + (3 + 4)(100) + (3 \\times 4) \\)"
                      },
                      {
                        stepNumber: 2,
                        title: "Simplify numerical terms",
                        content: "\\( = 10000 + 700 + 12 = 10712 \\)."
                      }
                    ],
                    finalAnswer: "Product = 10712."
                  }
                ]
              }
            ]
          },
          // Ch 9: Mensuration
          {
            id: "ch-8-9",
            chapterNumber: 9,
            title: "Mensuration",
            titleHindi: "क्षेत्रमिति",
            description: "Area of trapezium, general quadrilaterals, rhombus, surface area and volume of cube, cuboid, and cylinder.",
            icon: "📦",
            color: "#a855f7",
            summary: "Area of trapezium = (1/2)(a+b)h. Cylinder volume = πr²h, Cylinder TSA = 2πr(r+h).",
            exercises: [
              {
                id: "ex-8-9-1",
                exerciseNumber: "Exercise 9.1",
                title: "Area of Trapezium & Quadrilaterals",
                questions: [
                  {
                    id: "q-8-9-1-1",
                    questionNumber: "Question 1",
                    questionText: "The shape of the top surface of a table is a trapezium. Find its area if its parallel sides are 1 m and 1.2 m and perpendicular distance between them is 0.8 m.",
                    keyConcept: "\\( \\text{Area of Trapezium} = \\frac{1}{2}(a + b)h \\).",
                    diagramSvg: `<svg viewBox="0 0 240 140" style="max-width:100%; height:auto;"><polygon points="40,110 200,110 170,30 70,30" fill="none" stroke="#3b82f6" stroke-width="2.5"/><line x1="70" y1="30" x2="70" y2="110" stroke="#ef4444" stroke-width="2" stroke-dasharray="4"/><text x="120" y="22" fill="#ffffff" font-size="10">a = 1 m</text><text x="120" y="125" fill="#ffffff" font-size="10">b = 1.2 m</text><text x="45" y="75" fill="#ef4444" font-size="10">h = 0.8 m</text></svg>`,
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Substitute values into formula",
                        content: "\\( \\text{Area} = \\frac{1}{2}(1 + 1.2) \\times 0.8 = \\frac{1}{2}(2.2) \\times 0.8 = 1.1 \\times 0.8 = 0.88 \\text{ m}^2 \\)."
                      }
                    ],
                    finalAnswer: "Area = \\( 0.88 \\text{ m}^2 \\)."
                  }
                ]
              },
              {
                id: "ex-8-9-2",
                exerciseNumber: "Exercise 9.2",
                title: "Surface Area & Volume of Cuboids/Cylinders",
                questions: [
                  {
                    id: "q-8-9-2-1",
                    questionNumber: "Question 1",
                    questionText: "A cuboidal box has dimensions 60 cm × 54 cm × 30 cm. How many small cubes with side 6 cm can be placed in the box?",
                    keyConcept: "\\( \\text{Number of cubes} = \\frac{\\text{Volume of Cuboid}}{\\text{Volume of Cube}} \\).",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Calculate volume ratio",
                        content: "\\( N = \\frac{60 \\times 54 \\times 30}{6 \\times 6 \\times 6} = 10 \\times 9 \\times 5 = 450 \\text{ cubes} \\)."
                      }
                    ],
                    finalAnswer: "450 small cubes can fit inside."
                  }
                ]
              }
            ]
          },
          // Ch 10: Exponents and Powers
          {
            id: "ch-8-10",
            chapterNumber: 10,
            title: "Exponents and Powers",
            titleHindi: "घातांक और घात",
            description: "Powers with negative exponents, laws of exponents, expressing very large and small numbers in standard form.",
            icon: "🔢",
            color: "#f97316",
            summary: "Negative exponent rule: a^{-m} = 1/a^m. Standard form: a × 10^n (1 ≤ a < 10).",
            exercises: [
              {
                id: "ex-8-10-1",
                exerciseNumber: "Exercise 10.1",
                title: "Negative Exponents & Laws of Exponents",
                questions: [
                  {
                    id: "q-8-10-1-1",
                    questionNumber: "Question 1",
                    questionText: "Evaluate: (i) \\( 3^{-2} \\), (ii) \\( (-4)^{-2} \\).",
                    keyConcept: "\\( a^{-m} = \\frac{1}{a^m} \\).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Evaluate Part (i)",
                        content: "\\( 3^{-2} = \\frac{1}{3^2} = \\frac{1}{9} \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Evaluate Part (ii)",
                        content: "\\( (-4)^{-2} = \\frac{1}{(-4)^2} = \\frac{1}{16} \\)."
                      }
                    ],
                    finalAnswer: "(i) \\( \\frac{1}{9} \\), (ii) \\( \\frac{1}{16} \\)."
                  },
                  {
                    id: "q-8-10-1-2",
                    questionNumber: "Question 2",
                    questionText: "Express 0.0000000000085 in standard form.",
                    keyConcept: "Standard form: \\( k \\times 10^n \\) where \\( 1 \\le k < 10 \\).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Move decimal point 12 places to right",
                        content: "\\( 0.0000000000085 = 8.5 \\times 10^{-12} \\)."
                      }
                    ],
                    finalAnswer: "\\( 8.5 \\times 10^{-12} \\)."
                  }
                ]
              }
            ]
          },
          // Ch 11: Direct and Inverse Proportions
          {
            id: "ch-8-11",
            chapterNumber: 11,
            title: "Direct and Inverse Proportions",
            titleHindi: "सीधा और प्रतिलोम समानुपात",
            description: "Direct proportion x/y = k, inverse proportion x·y = k, and solving practical word problems.",
            icon: "📈",
            color: "#14b8a6",
            summary: "Direct proportion: as x increases, y increases proportionally. Inverse proportion: as x increases, y decreases proportionally.",
            exercises: [
              {
                id: "ex-8-11-1",
                exerciseNumber: "Exercise 11.1",
                title: "Direct Proportion Problems",
                questions: [
                  {
                    id: "q-8-11-1-1",
                    questionNumber: "Question 1",
                    questionText: "A machine in a soft drink factory fills 840 bottles in 6 hours. How many bottles will it fill in 5 hours?",
                    keyConcept: "Direct proportion: \\( \\frac{x_1}{y_1} = \\frac{x_2}{y_2} \\).",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Formulate proportion",
                        content: "\\( \\frac{840}{6} = \\frac{x}{5} \\)"
                      },
                      {
                        stepNumber: 2,
                        title: "Solve for x",
                        content: "\\( 140 = \\frac{x}{5} \\implies x = 140 \\times 5 = 700 \\text{ bottles} \\)."
                      }
                    ],
                    finalAnswer: "700 bottles."
                  }
                ]
              },
              {
                id: "ex-8-11-2",
                exerciseNumber: "Exercise 11.2",
                title: "Inverse Proportion Problems",
                questions: [
                  {
                    id: "q-8-11-2-1",
                    questionNumber: "Question 1",
                    questionText: "6 pipes fill a tank in 1 hour 20 minutes (80 minutes). How long will 5 pipes take?",
                    keyConcept: "Inverse proportion: \\( x_1 y_1 = x_2 y_2 \\).",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Set up inverse product equation",
                        content: "\\( 6 \\times 80 = 5 \\times y_2 \\)"
                      },
                      {
                        stepNumber: 2,
                        title: "Solve for y_2",
                        content: "\\( 480 = 5 y_2 \\implies y_2 = \\frac{480}{5} = 96 \\text{ minutes} = 1 \\text{ hour } 36 \\text{ minutes} \\)."
                      }
                    ],
                    finalAnswer: "96 minutes (1 hour 36 minutes)."
                  }
                ]
              }
            ]
          },
          // Ch 12: Factorisation
          {
            id: "ch-8-12",
            chapterNumber: 12,
            title: "Factorisation",
            titleHindi: "गुणनखंडन",
            description: "Common factors, regrouping terms, factorisation using algebraic identities, and division of algebraic expressions.",
            icon: "🧮",
            color: "#6366f1",
            summary: "Factorization breaks algebraic expressions into products of prime algebraic factors.",
            exercises: [
              {
                id: "ex-8-12-1",
                exerciseNumber: "Exercise 12.1",
                title: "Common Factors & Identities",
                questions: [
                  {
                    id: "q-8-12-1-1",
                    questionNumber: "Question 1",
                    questionText: "Find the common factors of the given terms: \\( 12x, 36 \\).",
                    keyConcept: "Express each term as product of prime factors.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Prime factorize terms",
                        content: "\\( 12x = 2 \\times 2 \\times 3 \\times x \\)\n\\( 36 = 2 \\times 2 \\times 3 \\times 3 \\)"
                      },
                      {
                        stepNumber: 2,
                        title: "Identify common factors",
                        content: "Common factors = \\( 2 \\times 2 \\times 3 = 12 \\)."
                      }
                    ],
                    finalAnswer: "Common factor = 12."
                  },
                  {
                    id: "q-8-12-1-2",
                    questionNumber: "Question 2",
                    questionText: "Factorize: (i) \\( a^2 + 8a + 16 \\), (ii) \\( 49p^2 - 36 \\).",
                    keyConcept: "Use identities: \\( (x + y)^2 = x^2 + 2xy + y^2 \\) and \\( x^2 - y^2 = (x - y)(x + y) \\).",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Factorize Part (i)",
                        content: "\\( a^2 + 2(a)(4) + 4^2 = (a + 4)^2 \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Factorize Part (ii)",
                        content: "\\( (7p)^2 - 6^2 = (7p - 6)(7p + 6) \\)."
                      }
                    ],
                    finalAnswer: "(i) \\( (a + 4)^2 \\)\n(ii) \\( (7p - 6)(7p + 6) \\)."
                  }
                ]
              }
            ]
          },
          // Ch 13: Introduction to Graphs
          {
            id: "ch-8-13",
            chapterNumber: 13,
            title: "Introduction to Graphs",
            titleHindi: "आलेखों से परिचय",
            description: "Line graphs, linear graphs, Cartesian coordinates (x, y), independent & dependent variables, and applications.",
            icon: "📊",
            color: "#10b981",
            summary: "Graphs represent visual relation between independent variable (x-axis) and dependent variable (y-axis).",
            exercises: [
              {
                id: "ex-8-13-1",
                exerciseNumber: "Exercise 13.1",
                title: "Reading & Interpreting Line Graphs",
                questions: [
                  {
                    id: "q-8-13-1-1",
                    questionNumber: "Question 1",
                    questionText: "A patient's recorded temperature graph shows: 9 am (35.5°C), 10 am (36°C), 11 am (39°C), 12 noon (38.5°C), 1 pm (36.5°C), 2 pm (36.5°C), 3 pm (37°C). (i) What was the patient's temperature at 1 pm? (ii) When was the temperature 38.5°C?",
                    keyConcept: "Read y-axis (temperature) for corresponding x-axis (time).",
                    diagramSvg: `<svg viewBox="0 0 320 160" style="max-width:100%; height:auto;"><line x1="30" y1="130" x2="300" y2="130" stroke="#94a3b8" stroke-width="2"/><line x1="30" y1="20" x2="30" y2="130" stroke="#94a3b8" stroke-width="2"/><polyline points="40,110 80,100 120,40 160,50 200,90 240,90 280,80" fill="none" stroke="#ef4444" stroke-width="2.5"/><circle cx="200" cy="90" r="4" fill="#10b981"/><text x="180" y="80" fill="#10b981" font-size="10" font-weight="bold">1 pm (36.5°C)</text></svg>`,
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Read graph at 1 pm",
                        content: "At 1 pm, the temperature line is at 36.5°C."
                      },
                      {
                        stepNumber: 2,
                        title: "Find time for 38.5°C",
                        content: "The temperature 38.5°C corresponds to 12 noon."
                      }
                    ],
                    finalAnswer: "(i) 36.5°C\n(ii) 12 noon."
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  // =================================================================
  // CLASS 9TH NCERT MATHEMATICS (GANITA MANJARI / गणित मंजरी)
  // =================================================================
  {
    id: "class-9",
    classNumber: 9,
    label: "Class 9th",
    cbseBookTitle: "NCERT Mathematics (Ganit Manjari / गणित मंजरी)",
    subjects: [
      {
        id: "maths",
        name: "Mathematics (गणित)",
        code: "MATH-09",
        icon: "📐",
        chapters: [
          // Ch 1: Number Systems
          {
            id: "ch-1",
            chapterNumber: 1,
            title: "Number Systems",
            titleHindi: "संख्या पद्धति",
            description: "Rational numbers, irrational numbers, real numbers, decimal expansions, rationalizing denominators, and laws of exponents for real numbers.",
            icon: "🔢",
            color: "#ef4444",
            summary: "Learn how to represent real numbers on a number line, convert repeating decimals to p/q form, rationalize denominators, and apply exponent laws.",
            exercises: [
              {
                id: "ex-1-1",
                exerciseNumber: "Exercise 1.1",
                title: "Introduction to Rational Numbers",
                questions: [
                  {
                    id: "q-1-1-1",
                    questionNumber: "Question 1",
                    questionText: "Is zero a rational number? Can you write it in the form \\( \\frac{p}{q} \\), where \\(p\\) and \\(q\\) are integers and \\(q \\neq 0\\)?",
                    keyConcept: "Definition of Rational Number: A number that can be expressed as \\( \\frac{p}{q} \\) where \\(q \\neq 0\\).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Recall definition of rational number",
                        content: "A rational number is any number that can be written in the form \\( \\frac{p}{q} \\), where \\(p\\) and \\(q\\) are integers and \\(q \\neq 0\\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Represent zero as a fraction",
                        content: "Zero can be written as \\( \\frac{0}{1} \\), \\( \\frac{0}{2} \\), \\( \\frac{0}{-5} \\), etc."
                      }
                    ],
                    finalAnswer: "Yes, zero is a rational number. It can be written in the form \\( \\frac{0}{1} \\), where \\(p = 0\\) and \\(q = 1 \\neq 0\\)."
                  },
                  {
                    id: "q-1-1-2",
                    questionNumber: "Question 2",
                    questionText: "Find six rational numbers between 3 and 4.",
                    keyConcept: "Multiply numerator and denominator of both numbers by \\( (n + 1) = 7 \\).",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Convert 3 and 4 with denominator 7",
                        content: "\\( 3 = \\frac{21}{7} \\) and \\( 4 = \\frac{28}{7} \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "List intermediate rational numbers",
                        content: "Fractions between \\( \\frac{21}{7} \\) and \\( \\frac{28}{7} \\) are \\( \\frac{22}{7}, \\frac{23}{7}, \\frac{24}{7}, \\frac{25}{7}, \\frac{26}{7}, \\frac{27}{7} \\)."
                      }
                    ],
                    finalAnswer: "\\( \\frac{22}{7}, \\frac{23}{7}, \\frac{24}{7}, \\frac{25}{7}, \\frac{26}{7}, \\frac{27}{7} \\)."
                  }
                ]
              },
              {
                id: "ex-1-2",
                exerciseNumber: "Exercise 1.2",
                title: "Irrational Numbers & Number Line",
                questions: [
                  {
                    id: "q-1-2-1",
                    questionNumber: "Question 1",
                    questionText: "Show how \\( \\sqrt{5} \\) can be represented on the number line.",
                    keyConcept: "Pythagoras Theorem: \\( 5 = 2^2 + 1^2 \\).",
                    diagramSvg: `<svg viewBox="0 0 380 110" style="max-width:100%; height:auto;"><line x1="20" y1="80" x2="360" y2="80" stroke="#94a3b8" stroke-width="2"/><circle cx="50" cy="80" r="4" fill="#ef4444"/><text x="50" y="100" fill="#94a3b8" font-size="11" text-anchor="middle">O (0)</text><circle cx="190" cy="80" r="4" fill="#ef4444"/><text x="190" y="100" fill="#94a3b8" font-size="11" text-anchor="middle">A (2)</text><line x1="190" y1="80" x2="190" y2="25" stroke="#3b82f6" stroke-width="2.5"/><text x="195" y="22" fill="#3b82f6" font-size="11">B (1)</text><line x1="50" y1="80" x2="190" y2="25" stroke="#10b981" stroke-width="2.5" stroke-dasharray="4"/><text x="110" y="50" fill="#10b981" font-size="11" font-weight="bold">√5</text><circle cx="305" cy="80" r="4" fill="#10b981"/><text x="305" y="100" fill="#10b981" font-size="11" font-weight="bold" text-anchor="middle">P (√5)</text></svg>`,
                    difficulty: "Hard",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Construct right triangle OAB",
                        content: "Base OA = 2 units, Perpendicular AB = 1 unit.\n\\( \\text{OB}^2 = 2^2 + 1^2 = 5 \\implies \\text{OB} = \\sqrt{5} \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Draw arc to number line",
                        content: "Draw arc with center O and radius OB intersecting x-axis at P."
                      }
                    ],
                    finalAnswer: "Point P on the number line represents \\( \\sqrt{5} \\)."
                  }
                ]
              }
            ]
          },
          // Ch 2: Polynomials
          {
            id: "ch-2",
            chapterNumber: 2,
            title: "Polynomials",
            titleHindi: "बहुपद",
            description: "Degree of polynomials, zeroes of a polynomial, remainder theorem, factor theorem, and algebraic identities.",
            icon: "📐",
            color: "#3b82f6",
            summary: "Master algebraic expressions, factorization of quadratic and cubic polynomials, and standard algebraic formulas.",
            exercises: [
              {
                id: "ex-2-1",
                exerciseNumber: "Exercise 2.1",
                title: "Polynomials in One Variable & Degree",
                questions: [
                  {
                    id: "q-2-1-1",
                    questionNumber: "Question 1",
                    questionText: "Which of the following expressions are polynomials in one variable and which are not? (i) \\( 4x^2 - 3x + 7 \\), (ii) \\( y^2 + \\sqrt{2} \\).",
                    keyConcept: "Exponents of variables must be non-negative integers (whole numbers).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Check exponents",
                        content: "In 4x² - 3x + 7, exponents are 2 and 1 (whole numbers). In y² + √2, exponent of y is 2."
                      }
                    ],
                    finalAnswer: "Both (i) and (ii) are polynomials in one variable."
                  }
                ]
              },
              {
                id: "ex-2-2",
                exerciseNumber: "Exercise 2.2",
                title: "Zeroes of Polynomials & Factorization",
                questions: [
                  {
                    id: "q-2-2-1",
                    questionNumber: "Question 1",
                    questionText: "Factorize by splitting middle term: \\( 12x^2 - 7x + 1 \\).",
                    keyConcept: "Find two numbers with sum = -7 and product = 12.",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Split middle term",
                        content: "\\( 12x^2 - 4x - 3x + 1 = 4x(3x - 1) - 1(3x - 1) = (4x - 1)(3x - 1) \\)."
                      }
                    ],
                    finalAnswer: "\\( (4x - 1)(3x - 1) \\)."
                  }
                ]
              }
            ]
          },
          // Ch 3: Coordinate Geometry
          {
            id: "ch-3",
            chapterNumber: 3,
            title: "Coordinate Geometry",
            titleHindi: "निर्देशांक ज्यामिति",
            description: "Cartesian plane, axes, origin, quadrants, plotting points, and coordinates of a point in 2D space.",
            icon: "📊",
            color: "#10b981",
            summary: "Learn how to locate points on a 2D Cartesian plane using ordered pairs (x, y).",
            exercises: [
              {
                id: "ex-3-1",
                exerciseNumber: "Exercise 3.1",
                title: "Cartesian Plane & Quadrants",
                questions: [
                  {
                    id: "q-3-1-1",
                    questionNumber: "Question 1",
                    questionText: "State the quadrant in which each of the following points lies: (-2, 4), (3, -1), (-1, 0), (1, 2).",
                    keyConcept: "Quadrant I (+,+), Quadrant II (-,+), Quadrant III (-,-), Quadrant IV (+,-).",
                    diagramSvg: `<svg viewBox="0 0 240 180" style="max-width:100%; height:auto;"><line x1="20" y1="90" x2="220" y2="90" stroke="#94a3b8" stroke-width="2"/><line x1="120" y1="20" x2="120" y2="160" stroke="#94a3b8" stroke-width="2"/><text x="160" y="55" fill="#3b82f6" font-size="10">Q I (+,+)</text><text x="40" y="55" fill="#ef4444" font-size="10">Q II (-,+)</text><text x="40" y="135" fill="#f59e0b" font-size="10">Q III (-,-)</text><text x="160" y="135" fill="#10b981" font-size="10">Q IV (+,-)</text></svg>`,
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Determine sign pairs",
                        content: "(-2, 4) -> (-,+) -> Quadrant II\n(3, -1) -> (+,-) -> Quadrant IV\n(-1, 0) -> lies on negative X-axis\n(1, 2) -> (+,+) -> Quadrant I."
                      }
                    ],
                    finalAnswer: "(-2,4) in Q II; (3,-1) in Q IV; (-1,0) on X-axis; (1,2) in Q I."
                  }
                ]
              }
            ]
          },
          // Ch 4: Linear Equations in Two Variables
          {
            id: "ch-4",
            chapterNumber: 4,
            title: "Linear Equations in Two Variables",
            titleHindi: "दो चरों वाले रैखिक समीकरण",
            description: "Linear equation form ax + by + c = 0, solutions, and straight line graphs.",
            icon: "📈",
            color: "#8b5cf6",
            summary: "ax + by + c = 0 has infinitely many solutions forming a straight line.",
            exercises: [
              {
                id: "ex-4-1",
                exerciseNumber: "Exercise 4.1",
                title: "Formulating & Solving Linear Equations",
                questions: [
                  {
                    id: "q-4-1-1",
                    questionNumber: "Question 1",
                    questionText: "The cost of a notebook is twice the cost of a pen. Write a linear equation in two variables: \\( x = 2y \\implies x - 2y = 0 \\).",
                    keyConcept: "Standard linear equation: ax + by + c = 0.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Formulate equation",
                        content: "Let notebook = x, pen = y. \\( x = 2y \\implies x - 2y = 0 \\)."
                      }
                    ],
                    finalAnswer: "\\( x - 2y = 0 \\)."
                  }
                ]
              }
            ]
          },
          // Ch 5: Introduction to Euclid's Geometry
          {
            id: "ch-5",
            chapterNumber: 5,
            title: "Introduction to Euclid's Geometry",
            titleHindi: "यूक्लिड की ज्यामिति का परिचय",
            description: "Euclid's definitions, axioms, and postulates.",
            icon: "🏛️",
            color: "#f59e0b",
            summary: "Axioms are universal truths; Postulates apply specifically to geometry.",
            exercises: [
              {
                id: "ex-5-1",
                exerciseNumber: "Exercise 5.1",
                title: "Axioms & Postulates",
                questions: [
                  {
                    id: "q-5-1-1",
                    questionNumber: "Question 1",
                    questionText: "If point C is midpoint of AB, prove \\( AC = \\frac{1}{2}AB \\).",
                    keyConcept: "AB = AC + BC = AC + AC = 2AC.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Substitute AC for BC",
                        content: "AB = AC + BC = 2AC \\( \\implies AC = \\frac{1}{2}AB \\)."
                      }
                    ],
                    finalAnswer: "\\( AC = \\frac{1}{2}AB \\) (Proven)."
                  }
                ]
              }
            ]
          },
          // Ch 6: Lines and Angles
          {
            id: "ch-6",
            chapterNumber: 6,
            title: "Lines and Angles",
            titleHindi: "रेखाएँ और कोण",
            description: "Intersecting lines, linear pair, vertically opposite angles, parallel lines & transversal.",
            icon: "📐",
            color: "#ec4899",
            summary: "Linear pair sum = 180°. Vertically opposite angles are equal. Parallel line alternate interior angles are equal.",
            exercises: [
              {
                id: "ex-6-1",
                exerciseNumber: "Exercise 6.1",
                title: "Pairs of Angles & Intersecting Lines",
                questions: [
                  {
                    id: "q-6-1-1",
                    questionNumber: "Question 1",
                    questionText: "Lines AB and CD intersect at O. If \\( \\angle AOC + \\angle BOE = 70^\\circ \\) and \\( \\angle BOD = 40^\\circ \\), find \\( \\angle BOE \\) and reflex \\( \\angle COE \\).",
                    keyConcept: "Vertically opposite angles are equal.",
                    diagramSvg: `<svg viewBox="0 0 320 140" style="max-width:100%; height:auto;"><line x1="30" y1="110" x2="290" y2="30" stroke="#ef4444" stroke-width="2.5"/><line x1="30" y1="30" x2="290" y2="110" stroke="#3b82f6" stroke-width="2.5"/><circle cx="160" cy="70" r="4" fill="#ffffff"/><text x="160" y="60" fill="#ffffff" font-size="11" text-anchor="middle">O</text></svg>`,
                    difficulty: "Hard",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Find AOC and BOE",
                        content: "\\( \\angle AOC = \\angle BOD = 40^\\circ \\).\n\\( 40^\\circ + \\angle BOE = 70^\\circ \\implies \\angle BOE = 30^\\circ \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Find Reflex COE",
                        content: "\\( \\angle COE = 180^\\circ - 70^\\circ = 110^\\circ \\implies \\text{Reflex } \\angle COE = 360^\\circ - 110^\\circ = 250^\\circ \\)."
                      }
                    ],
                    finalAnswer: "\\( \\angle BOE = 30^\\circ \\) and Reflex \\( \\angle COE = 250^\\circ \\)."
                  }
                ]
              }
            ]
          },
          // Ch 7: Triangles
          {
            id: "ch-7",
            chapterNumber: 7,
            title: "Triangles",
            titleHindi: "त्रिभुज",
            description: "Congruence criteria (SAS, ASA, SSS, RHS) and isosceles triangle properties.",
            icon: "🔺",
            color: "#06b6d4",
            summary: "Congruent triangles have equal corresponding sides and angles (CPCT).",
            exercises: [
              {
                id: "ex-7-1",
                exerciseNumber: "Exercise 7.1",
                title: "Congruence Criteria & Proofs",
                questions: [
                  {
                    id: "q-7-1-1",
                    questionNumber: "Question 1",
                    questionText: "In quadrilateral ACBD, AC = AD and AB bisects \\( \\angle A \\). Show \\( \\Delta ABC \\cong \\Delta ABD \\).",
                    keyConcept: "SAS Congruence Rule.",
                    diagramSvg: `<svg viewBox="0 0 280 160" style="max-width:100%; height:auto;"><polygon points="30,80 140,20 250,80 140,140" fill="none" stroke="#3b82f6" stroke-width="2.5"/><line x1="30" y1="80" x2="250" y2="80" stroke="#ef4444" stroke-width="2.5"/></svg>`,
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Compare Triangles ABC and ABD",
                        content: "1. AC = AD (Given), 2. ∠CAB = ∠DAB (Bisector), 3. AB = AB (Common).\nBy SAS rule, \\( \\Delta ABC \\cong \\Delta ABD \\)."
                      }
                    ],
                    finalAnswer: "\\( \\Delta ABC \\cong \\Delta ABD \\) (Proven by SAS)."
                  }
                ]
              }
            ]
          },
          // Ch 8: Quadrilaterals
          {
            id: "ch-8",
            chapterNumber: 8,
            title: "Quadrilaterals",
            titleHindi: "चतुर्भुज",
            description: "Properties of parallelograms and Mid-point Theorem.",
            icon: "🔷",
            color: "#84cc16",
            summary: "Mid-point theorem: Line joining midpoints of two triangle sides is parallel to third side and half of it.",
            exercises: [
              {
                id: "ex-8-1",
                exerciseNumber: "Exercise 8.1",
                title: "Parallelograms & Mid-point Theorem",
                questions: [
                  {
                    id: "q-8-1-1",
                    questionNumber: "Question 1",
                    questionText: "If diagonals of a parallelogram are equal, show it is a rectangle.",
                    keyConcept: "Parallelogram with one angle 90° is a rectangle.",
                    difficulty: "Hard",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Prove SSS congruence of ΔABC and ΔBAD",
                        content: "BC = AD, AC = BD, AB = BA \\( \\implies \\Delta ABC \\cong \\Delta BAD \\).\n\\( \\angle ABC = \\angle BAD \\). Since sum is 180°, \\( \\angle ABC = 90^\\circ \\)."
                      }
                    ],
                    finalAnswer: "ABCD is a rectangle (Proven)."
                  }
                ]
              }
            ]
          },
          // Ch 9: Circles
          {
            id: "ch-9",
            chapterNumber: 9,
            title: "Circles",
            titleHindi: "वृत्त",
            description: "Chords, subtended angles, perpendicular from center, and cyclic quadrilaterals.",
            icon: "⭕",
            color: "#a855f7",
            summary: "Angle at center is double angle at circumference.",
            exercises: [
              {
                id: "ex-9-1",
                exerciseNumber: "Exercise 9.1",
                title: "Subtended Angles & Circle Theorems",
                questions: [
                  {
                    id: "q-9-1-1",
                    questionNumber: "Question 1",
                    questionText: "If central angle \\( \\angle AOC = 90^\\circ \\), find angle subtended at circumference \\( \\angle ADC \\).",
                    keyConcept: "\\( \\angle ADC = \\frac{1}{2} \\angle AOC \\).",
                    diagramSvg: `<svg viewBox="0 0 200 200" style="max-width:100%; height:auto;"><circle cx="100" cy="100" r="75" fill="none" stroke="#3b82f6" stroke-width="2.5"/><circle cx="100" cy="100" r="4" fill="#ef4444"/><text x="105" y="95" fill="#ef4444" font-size="10">O</text><line x1="100" y1="100" x2="175" y2="100" stroke="#10b981" stroke-width="2"/><line x1="100" y1="100" x2="25" y2="100" stroke="#10b981" stroke-width="2"/><line x1="25" y1="100" x2="100" y2="175" stroke="#f59e0b" stroke-width="2"/><line x1="175" y1="100" x2="100" y2="175" stroke="#f59e0b" stroke-width="2"/><text x="100" y="192" fill="#f59e0b" font-size="10" font-weight="bold" text-anchor="middle">D (45°)</text></svg>`,
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Apply Subtended Angle Theorem",
                        content: "\\( \\angle ADC = \\frac{1}{2}(90^\\circ) = 45^\\circ \\)."
                      }
                    ],
                    finalAnswer: "\\( \\angle ADC = 45^\\circ \\)."
                  }
                ]
              }
            ]
          },
          // Ch 10: Heron's Formula
          {
            id: "ch-10",
            chapterNumber: 10,
            title: "Heron's Formula",
            titleHindi: "हीरोन का सूत्र",
            description: "Area of triangle using semi-perimeter s = (a+b+c)/2, Area = √[s(s-a)(s-b)(s-c)].",
            icon: "📐",
            color: "#f97316",
            summary: "Heron's formula computes area using side lengths without needing perpendicular height.",
            exercises: [
              {
                id: "ex-10-1",
                exerciseNumber: "Exercise 10.1",
                title: "Area Calculations using Heron's Formula",
                questions: [
                  {
                    id: "q-10-1-1",
                    questionNumber: "Question 1",
                    questionText: "Equilateral triangle signal board with perimeter 180 cm. Find area.",
                    keyConcept: "Side a = 180/3 = 60 cm. Area = \\( \\frac{\\sqrt{3}}{4}a^2 \\).",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Calculate area",
                        content: "\\( \\text{Area} = \\frac{\\sqrt{3}}{4} \\times 60^2 = 900\\sqrt{3} \\text{ cm}^2 \\)."
                      }
                    ],
                    finalAnswer: "\\( 900\\sqrt{3} \\text{ cm}^2 \\approx 1558.84 \\text{ cm}^2 \\)."
                  }
                ]
              }
            ]
          },
          // Ch 11: Surface Areas and Volumes
          {
            id: "ch-11",
            chapterNumber: 11,
            title: "Surface Areas and Volumes",
            titleHindi: "पृष्ठीय क्षेत्रफल और आयतन",
            description: "Surface area and volume of cones, spheres, and hemispheres.",
            icon: "📦",
            color: "#6366f1",
            summary: "Cone CSA = πrl, Sphere Area = 4πr², Hemisphere TSA = 3πr².",
            exercises: [
              {
                id: "ex-11-1",
                exerciseNumber: "Exercise 11.1",
                title: "Surface Area of Cones & Spheres",
                questions: [
                  {
                    id: "q-11-1-1",
                    questionNumber: "Question 1",
                    questionText: "Base diameter of cone is 10.5 cm, slant height is 10 cm. Find CSA.",
                    keyConcept: "CSA = \\( \\pi r l \\) where r = 10.5/2 = 5.25 cm.",
                    diagramSvg: `<svg viewBox="0 0 200 180" style="max-width:100%; height:auto;"><ellipse cx="100" cy="150" rx="55" ry="18" fill="none" stroke="#3b82f6" stroke-width="2"/><line x1="45" y1="150" x2="100" y2="25" stroke="#ef4444" stroke-width="2"/><line x1="155" y1="150" x2="100" y2="25" stroke="#ef4444" stroke-width="2"/></svg>`,
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Calculate CSA",
                        content: "\\( \\text{CSA} = \\frac{22}{7} \\times 5.25 \\times 10 = 165 \\text{ cm}^2 \\)."
                      }
                    ],
                    finalAnswer: "\\( 165 \\text{ cm}^2 \\)."
                  }
                ]
              }
            ]
          },
          // Ch 12: Statistics
          {
            id: "ch-12",
            chapterNumber: 12,
            title: "Statistics",
            titleHindi: "सांख्यिकी",
            description: "Bar graphs, histograms, and frequency polygons.",
            icon: "📊",
            color: "#14b8a6",
            summary: "Represent statistical distributions visually.",
            exercises: [
              {
                id: "ex-12-1",
                exerciseNumber: "Exercise 12.1",
                title: "Bar Graphs & Histograms",
                questions: [
                  {
                    id: "q-12-1-1",
                    questionNumber: "Question 1",
                    questionText: "Female illness survey percentage representation via Bar Graph.",
                    keyConcept: "Highest percentage category represents major cause.",
                    diagramSvg: `<svg viewBox="0 0 320 160" style="max-width:100%; height:auto;"><line x1="30" y1="140" x2="300" y2="140" stroke="#94a3b8" stroke-width="2"/><rect x="45" y="30" width="25" height="110" fill="#ef4444" rx="3"/><text x="57" y="22" fill="#ef4444" font-size="8" font-weight="bold" text-anchor="middle">31.8%</text></svg>`,
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Analyze data",
                        content: "Reproductive health conditions (31.8%) is the major cause."
                      }
                    ],
                    finalAnswer: "Reproductive health conditions (31.8%) is the major cause."
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },

  // =================================================================
  // CLASS 10TH NCERT MATHEMATICS DATASET
  // =================================================================
  {
    id: "class-10",
    classNumber: 10,
    label: "Class 10th",
    cbseBookTitle: "NCERT Mathematics (गणित / Mathematics Class X)",
    subjects: [
      {
        id: "maths",
        name: "Mathematics (गणित)",
        code: "MATH-10",
        icon: "📐",
        chapters: [
          // -------------------------------------------------------------
          // CHAPTER 1: REAL NUMBERS
          // -------------------------------------------------------------
          {
            id: "ch-10-1",
            chapterNumber: 1,
            title: "Real Numbers",
            titleHindi: "वास्तविक संख्याएँ",
            description: "Fundamental Theorem of Arithmetic, prime factorization, HCF and LCM, and proving irrationality of √2, √3, √5.",
            icon: "🔢",
            color: "#ef4444",
            summary: "Master prime factor decomposition, HCF × LCM = a × b relation, and contradiction proofs for irrational numbers.",
            exercises: [
              {
                id: "ex-10-1-1",
                exerciseNumber: "Exercise 1.1",
                title: "Fundamental Theorem of Arithmetic & HCF/LCM",
                questions: [
                  {
                    id: "q-10-1-1-1",
                    questionNumber: "Question 1",
                    questionText: "Express each number as a product of its prime factors: (i) 140, (ii) 156, (iii) 3825.",
                    keyConcept: "Fundamental Theorem of Arithmetic: Every composite number can be expressed uniquely as a product of primes.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Prime factorize 140",
                        content: "\\( 140 = 2 \\times 70 = 2 \\times 2 \\times 35 = 2^2 \\times 5 \\times 7 \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Prime factorize 156",
                        content: "\\( 156 = 2 \\times 78 = 2 \\times 2 \\times 39 = 2^2 \\times 3 \\times 13 \\)."
                      },
                      {
                        stepNumber: 3,
                        title: "Prime factorize 3825",
                        content: "\\( 3825 = 3 \\times 1275 = 3 \\times 3 \\times 425 = 3^2 \\times 5^2 \\times 17 \\)."
                      }
                    ],
                    finalAnswer: "(i) \\( 140 = 2^2 \\times 5 \\times 7 \\)\n(ii) \\( 156 = 2^2 \\times 3 \\times 13 \\)\n(iii) \\( 3825 = 3^2 \\times 5^2 \\times 17 \\)."
                  },
                  {
                    id: "q-10-1-1-2",
                    questionNumber: "Question 2",
                    questionText: "Find the HCF and LCM of 26 and 91 and verify that \\( \\text{HCF} \\times \\text{LCM} = \\text{product of the two numbers} \\).",
                    keyConcept: "\\( \\text{HCF}(a, b) \\times \\text{LCM}(a, b) = a \\times b \\).",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Find prime factorizations",
                        content: "\\( 26 = 2 \\times 13 \\)\n\\( 91 = 7 \\times 13 \\)"
                      },
                      {
                        stepNumber: 2,
                        title: "Calculate HCF and LCM",
                        content: "\\( \\text{HCF}(26, 91) = 13 \\)\n\\( \\text{LCM}(26, 91) = 2 \\times 7 \\times 13 = 182 \\)"
                      },
                      {
                        stepNumber: 3,
                        title: "Verify relationship",
                        content: "\\( \\text{HCF} \\times \\text{LCM} = 13 \\times 182 = 2366 \\)\n\\( \\text{Product of numbers} = 26 \\times 91 = 2366 \\)."
                      }
                    ],
                    finalAnswer: "HCF = 13, LCM = 182. Verification: 13 × 182 = 26 × 91 = 2366 (Verified)."
                  }
                ]
              },
              {
                id: "ex-10-1-2",
                exerciseNumber: "Exercise 1.2",
                title: "Revisiting Irrational Numbers",
                questions: [
                  {
                    id: "q-10-1-2-1",
                    questionNumber: "Question 1",
                    questionText: "Prove that \\( \\sqrt{5} \\) is irrational.",
                    keyConcept: "Proof by contradiction: Assume \\( \\sqrt{5} = \\frac{a}{b} \\) where a and b are co-prime integers.",
                    difficulty: "Hard",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Assume √5 is rational",
                        content: "Let \\( \\sqrt{5} = \\frac{a}{b} \\), where a and b are co-prime integers (\\( \\text{HCF}(a,b) = 1 \\)) and \\( b \\neq 0 \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Square both sides",
                        content: "\\( 5 = \\frac{a^2}{b^2} \\implies a^2 = 5b^2 \\) ---- (Eq 1).\nThis implies 5 divides \\(a^2\\), so 5 divides a."
                      },
                      {
                        stepNumber: 3,
                        title: "Substitute a = 5c into Eq 1",
                        content: "\\( (5c)^2 = 5b^2 \\implies 25c^2 = 5b^2 \\implies b^2 = 5c^2 \\).\nThis implies 5 divides \\(b^2\\), so 5 divides b."
                      },
                      {
                        stepNumber: 4,
                        title: "Reach contradiction",
                        content: "5 is a common factor of both a and b, contradicting that a and b are co-prime. Hence, \\( \\sqrt{5} \\) must be irrational."
                      }
                    ],
                    finalAnswer: "\\( \\sqrt{5} \\) is irrational (Proven by contradiction)."
                  }
                ]
              }
            ]
          },

          // -------------------------------------------------------------
          // CHAPTER 2: POLYNOMIALS
          // -------------------------------------------------------------
          {
            id: "ch-10-2",
            chapterNumber: 2,
            title: "Polynomials",
            titleHindi: "बहुपद",
            description: "Geometrical meaning of zeroes, relationship between zeroes and coefficients of a quadratic polynomial.",
            icon: "📐",
            color: "#3b82f6",
            summary: "For quadratic polynomial ax² + bx + c: Sum of zeroes α + β = -b/a, Product of zeroes αβ = c/a.",
            exercises: [
              {
                id: "ex-10-2-1",
                exerciseNumber: "Exercise 2.1",
                title: "Zeroes from Graph of a Polynomial",
                questions: [
                  {
                    id: "q-10-2-1-1",
                    questionNumber: "Question 1",
                    questionText: "The graphs of \\( y = p(x) \\) are given. Find the number of zeroes of \\( p(x) \\) in each case by observing the x-axis intersection points.",
                    keyConcept: "Number of zeroes of p(x) equals number of points where the graph intersects the x-axis.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Observe x-axis intersection points",
                        content: "Count how many times the curve intersects or touches the horizontal x-axis."
                      }
                    ],
                    finalAnswer: "Number of zeroes = Number of intersection points of graph with x-axis."
                  }
                ]
              },
              {
                id: "ex-10-2-2",
                exerciseNumber: "Exercise 2.2",
                title: "Zeroes & Coefficients Relationship",
                questions: [
                  {
                    id: "q-10-2-2-1",
                    questionNumber: "Question 1",
                    questionText: "Find the zeroes of the quadratic polynomial \\( x^2 - 2x - 8 \\) and verify the relationship between the zeroes and the coefficients.",
                    keyConcept: "\\( \\alpha + \\beta = -\\frac{b}{a} \\) and \\( \\alpha \\beta = \\frac{c}{a} \\).",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Factorize polynomial to find zeroes",
                        content: "\\( x^2 - 4x + 2x - 8 = 0 \\implies x(x - 4) + 2(x - 4) = 0 \\implies (x - 4)(x + 2) = 0 \\).\nZeroes are \\( \\alpha = 4 \\) and \\( \\beta = -2 \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Verify Sum of Zeroes",
                        content: "\\( \\alpha + \\beta = 4 + (-2) = 2 \\).\nFrom formula: \\( -\\frac{b}{a} = -\\frac{-2}{1} = 2 \\) (Verified)."
                      },
                      {
                        stepNumber: 3,
                        title: "Verify Product of Zeroes",
                        content: "\\( \\alpha \\beta = 4 \\times (-2) = -8 \\).\nFrom formula: \\( \\frac{c}{a} = \\frac{-8}{1} = -8 \\) (Verified)."
                      }
                    ],
                    finalAnswer: "Zeroes: 4 and -2. Sum = 2, Product = -8 (Relationship Verified)."
                  }
                ]
              }
            ]
          },

          // -------------------------------------------------------------
          // CHAPTER 3: PAIR OF LINEAR EQUATIONS IN TWO VARIABLES
          // -------------------------------------------------------------
          {
            id: "ch-10-3",
            chapterNumber: 3,
            title: "Pair of Linear Equations in Two Variables",
            titleHindi: "दो चरों वाले रैखिक समीकरण युग्म",
            description: "Graphical and algebraic methods (Substitution, Elimination) for solving pair of linear equations in two variables.",
            icon: "📈",
            color: "#10b981",
            summary: "Compare ratios a₁/a₂, b₁/b₂, c₁/c₂ for consistency: unique solution (intersecting), infinitely many (coincident), or no solution (parallel).",
            exercises: [
              {
                id: "ex-10-3-1",
                exerciseNumber: "Exercise 3.1",
                title: "Consistency & Graphical Interpretation",
                questions: [
                  {
                    id: "q-10-3-1-1",
                    questionNumber: "Question 1",
                    questionText: "On comparing the ratios \\( \\frac{a_1}{a_2}, \\frac{b_1}{b_2}, \\frac{c_1}{c_2} \\), find out whether the lines representing the following pair of linear equations intersect at a point, are parallel or coincident:\n\n\\( 5x - 4y + 8 = 0 \\)\n\\( 7x + 6y - 9 = 0 \\)",
                    keyConcept: "If \\( \\frac{a_1}{a_2} \\neq \\frac{b_1}{b_2} \\), the lines intersect at a single point (unique solution).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Identify coefficients",
                        content: "\\( a_1 = 5, b_1 = -4, c_1 = 8 \\)\n\\( a_2 = 7, b_2 = 6, c_2 = -9 \\)"
                      },
                      {
                        stepNumber: 2,
                        title: "Calculate ratios",
                        content: "\\( \\frac{a_1}{a_2} = \\frac{5}{7} \\)\n\\( \\frac{b_1}{b_2} = \\frac{-4}{6} = -\\frac{2}{3} \\)"
                      },
                      {
                        stepNumber: 3,
                        title: "Compare ratios",
                        content: "Since \\( \\frac{5}{7} \\neq -\\frac{2}{3} \\), i.e., \\( \\frac{a_1}{a_2} \\neq \\frac{b_1}{b_2} \\)."
                      }
                    ],
                    finalAnswer: "The lines intersect at a single point (Unique solution)."
                  }
                ]
              },
              {
                id: "ex-10-3-2",
                exerciseNumber: "Exercise 3.2",
                title: "Substitution & Elimination Method",
                questions: [
                  {
                    id: "q-10-3-2-1",
                    questionNumber: "Question 1",
                    questionText: "Solve the pair of linear equations by elimination method:\n\n\\( x + y = 5 \\) ---- (Eq 1)\n\\( 2x - 3y = 4 \\) ---- (Eq 2)",
                    keyConcept: "Elimination method: Multiply equations by constants to equalize coefficients of one variable.",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Multiply Eq 1 by 3 to eliminate y",
                        content: "\\( 3(x + y) = 3(5) \\implies 3x + 3y = 15 \\) ---- (Eq 3)."
                      },
                      {
                        stepNumber: 2,
                        title: "Add Eq 2 and Eq 3",
                        content: "\\( (2x - 3y) + (3x + 3y) = 4 + 15 \\implies 5x = 19 \\implies x = \\frac{19}{5} \\)."
                      },
                      {
                        stepNumber: 3,
                        title: "Substitute x into Eq 1",
                        content: "\\( \\frac{19}{5} + y = 5 \\implies y = 5 - \\frac{19}{5} = \\frac{6}{5} \\)."
                      }
                    ],
                    finalAnswer: "\\( x = \\frac{19}{5} \\) and \\( y = \\frac{6}{5} \\)."
                  }
                ]
              }
            ]
          },

          // -------------------------------------------------------------
          // CHAPTER 4: QUADRATIC EQUATIONS
          // -------------------------------------------------------------
          {
            id: "ch-10-4",
            chapterNumber: 4,
            title: "Quadratic Equations",
            titleHindi: "द्विघात समीकरण",
            description: "Standard form ax² + bx + c = 0, solution by factorization, quadratic formula, and discriminant D = b² - 4ac.",
            icon: "🧮",
            color: "#8b5cf6",
            summary: "Quadratic formula \\( x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\). If D > 0 (2 distinct real roots), D = 0 (2 equal real roots), D < 0 (no real roots).",
            exercises: [
              {
                id: "ex-10-4-1",
                exerciseNumber: "Exercise 4.1",
                title: "Formulating Quadratic Equations",
                questions: [
                  {
                    id: "q-10-4-1-1",
                    questionNumber: "Question 1",
                    questionText: "Check whether \\( (x + 1)^2 = 2(x - 3) \\) is a quadratic equation.",
                    keyConcept: "A quadratic equation must be of the form \\( ax^2 + bx + c = 0 \\) with \\( a \\neq 0 \\) (degree 2).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Expand both sides",
                        content: "\\( x^2 + 2x + 1 = 2x - 6 \\)"
                      },
                      {
                        stepNumber: 2,
                        title: "Rearrange terms",
                        content: "\\( x^2 + 2x - 2x + 1 + 6 = 0 \\implies x^2 + 7 = 0 \\)."
                      },
                      {
                        stepNumber: 3,
                        title: "Check degree",
                        content: "It is of form \\( 1x^2 + 0x + 7 = 0 \\) where \\( a = 1 \\neq 0 \\). Degree is 2."
                      }
                    ],
                    finalAnswer: "Yes, it is a quadratic equation."
                  }
                ]
              },
              {
                id: "ex-10-4-2",
                exerciseNumber: "Exercise 4.2",
                title: "Quadratic Formula & Discriminant",
                questions: [
                  {
                    id: "q-10-4-2-1",
                    questionNumber: "Question 1",
                    questionText: "Find the roots of the quadratic equation \\( 2x^2 - 7x + 3 = 0 \\) using the quadratic formula.",
                    keyConcept: "Quadratic formula: \\( x = \\frac{-b \\pm \\sqrt{D}}{2a} \\) where \\( D = b^2 - 4ac \\).",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Identify a, b, c and compute Discriminant D",
                        content: "\\( a = 2, b = -7, c = 3 \\)\n\\( D = (-7)^2 - 4(2)(3) = 49 - 24 = 25 \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Apply Quadratic Formula",
                        content: "\\( x = \\frac{-(-7) \\pm \\sqrt{25}}{2(2)} = \\frac{7 \\pm 5}{4} \\)"
                      },
                      {
                        stepNumber: 3,
                        title: "Calculate two roots",
                        content: "\\( x_1 = \\frac{7 + 5}{4} = 3 \\)\n\\( x_2 = \\frac{7 - 5}{4} = \\frac{1}{2} \\)."
                      }
                    ],
                    finalAnswer: "Roots are 3 and \\( \\frac{1}{2} \\)."
                  }
                ]
              }
            ]
          },

          // -------------------------------------------------------------
          // CHAPTER 5: ARITHMETIC PROGRESSIONS
          // -------------------------------------------------------------
          {
            id: "ch-10-5",
            chapterNumber: 5,
            title: "Arithmetic Progressions",
            titleHindi: "समांतर श्रेढियाँ",
            description: "nth term of an AP: a_n = a + (n-1)d, sum of first n terms: S_n = (n/2)[2a + (n-1)d].",
            icon: "🔢",
            color: "#f59e0b",
            summary: "Learn how to find term values, common difference d = a_{k} - a_{k-1}, and sum of finite AP series.",
            exercises: [
              {
                id: "ex-10-5-1",
                exerciseNumber: "Exercise 5.1",
                title: "nth Term of an AP",
                questions: [
                  {
                    id: "q-10-5-1-1",
                    questionNumber: "Question 1",
                    questionText: "Find the 10th term of the AP: 2, 7, 12, ...",
                    keyConcept: "\\( a_n = a + (n - 1)d \\).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Identify first term 'a' and common difference 'd'",
                        content: "First term \\( a = 2 \\)\nCommon difference \\( d = 7 - 2 = 5 \\)\nTerm number \\( n = 10 \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Apply formula",
                        content: "\\( a_{10} = 2 + (10 - 1) \\times 5 = 2 + 9 \\times 5 = 2 + 45 = 47 \\)."
                      }
                    ],
                    finalAnswer: "The 10th term of the AP is 47."
                  }
                ]
              },
              {
                id: "ex-10-5-2",
                exerciseNumber: "Exercise 5.2",
                title: "Sum of First n Terms of an AP",
                questions: [
                  {
                    id: "q-10-5-2-1",
                    questionNumber: "Question 1",
                    questionText: "Find the sum of the first 22 terms of the AP: 8, 3, -2, ...",
                    keyConcept: "\\( S_n = \\frac{n}{2}[2a + (n - 1)d] \\).",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Identify values",
                        content: "\\( a = 8, d = 3 - 8 = -5, n = 22 \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Substitute into sum formula",
                        content: "\\( S_{22} = \\frac{22}{2}[2(8) + (22 - 1)(-5)] = 11[16 + 21(-5)] = 11[16 - 105] = 11[-89] = -979 \\)."
                      }
                    ],
                    finalAnswer: "Sum of first 22 terms = -979."
                  }
                ]
              }
            ]
          },

          // -------------------------------------------------------------
          // CHAPTER 6: TRIANGLES
          // -------------------------------------------------------------
          {
            id: "ch-10-6",
            chapterNumber: 6,
            title: "Triangles",
            titleHindi: "त्रिभुज",
            description: "Basic Proportionality Theorem (Thales Theorem), converse of BPT, and similarity criteria for triangles (AAA, SSS, SAS).",
            icon: "🔺",
            color: "#ec4899",
            summary: "Thales Theorem: If a line is drawn parallel to one side of a triangle, it divides the other two sides in the same ratio.",
            exercises: [
              {
                id: "ex-10-6-1",
                exerciseNumber: "Exercise 6.1",
                title: "Basic Proportionality Theorem (BPT / Thales Theorem)",
                questions: [
                  {
                    id: "q-10-6-1-1",
                    questionNumber: "Question 1",
                    questionText: "In triangle ABC, DE is parallel to BC. If AD = 1.5 cm, DB = 3 cm, and AE = 1 cm, find EC.",
                    keyConcept: "Thales Theorem (BPT): If DE || BC in ΔABC, then \\( \\frac{AD}{DB} = \\frac{AE}{EC} \\).",
                    diagramSvg: `<svg viewBox="0 0 260 180" style="max-width:100%; height:auto;"><polygon points="130,20 30,160 230,160" fill="none" stroke="#3b82f6" stroke-width="2.5"/><line x1="80" y1="90" x2="180" y2="90" stroke="#ef4444" stroke-width="2.5"/><text x="130" y="14" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle">A</text><text x="15" y="165" fill="#ffffff" font-size="11" font-weight="bold">B</text><text x="238" y="165" fill="#ffffff" font-size="11" font-weight="bold">C</text><text x="68" y="95" fill="#ef4444" font-size="11" font-weight="bold">D</text><text x="188" y="95" fill="#ef4444" font-size="11" font-weight="bold">E</text><text x="90" y="55" fill="#10b981" font-size="10">AD=1.5</text><text x="50" y="130" fill="#10b981" font-size="10">DB=3</text><text x="165" y="55" fill="#10b981" font-size="10">AE=1</text></svg>`,
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Apply BPT ratio formula",
                        content: "\\( \\frac{AD}{DB} = \\frac{AE}{EC} \\)"
                      },
                      {
                        stepNumber: 2,
                        title: "Substitute given side lengths",
                        content: "\\( \\frac{1.5}{3} = \\frac{1}{EC} \\implies \\frac{1}{2} = \\frac{1}{EC} \\)"
                      },
                      {
                        stepNumber: 3,
                        title: "Solve for EC",
                        content: "\\( EC = 2 \\text{ cm} \\)."
                      }
                    ],
                    finalAnswer: "\\( EC = 2 \\text{ cm} \\)."
                  }
                ]
              }
            ]
          },

          // -------------------------------------------------------------
          // CHAPTER 7: COORDINATE GEOMETRY
          // -------------------------------------------------------------
          {
            id: "ch-10-7",
            chapterNumber: 7,
            title: "Coordinate Geometry",
            titleHindi: "निर्देशांक ज्यामिति",
            description: "Distance formula, section formula, and midpoint formula in 2D Cartesian plane.",
            icon: "📍",
            color: "#06b6d4",
            summary: "Distance formula \\( d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2} \\). Section formula \\( P(x,y) = \\left(\\frac{m_1 x_2 + m_2 x_1}{m_1 + m_2}, \\frac{m_1 y_2 + m_2 y_1}{m_1 + m_2}\\right) \\).",
            exercises: [
              {
                id: "ex-10-7-1",
                exerciseNumber: "Exercise 7.1",
                title: "Distance Formula",
                questions: [
                  {
                    id: "q-10-7-1-1",
                    questionNumber: "Question 1",
                    questionText: "Find the distance between points P(2, 3) and Q(4, 1).",
                    keyConcept: "Distance Formula: \\( PQ = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2} \\).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Identify coordinates",
                        content: "\\( x_1 = 2, y_1 = 3 \\)\n\\( x_2 = 4, y_2 = 1 \\)"
                      },
                      {
                        stepNumber: 2,
                        title: "Apply Distance Formula",
                        content: "\\( PQ = \\sqrt{(4 - 2)^2 + (1 - 3)^2} = \\sqrt{2^2 + (-2)^2} = \\sqrt{4 + 4} = \\sqrt{8} = 2\\sqrt{2} \\text{ units} \\)."
                      }
                    ],
                    finalAnswer: "\\( 2\\sqrt{2} \\text{ units} \\approx 2.83 \\text{ units} \\)."
                  }
                ]
              },
              {
                id: "ex-10-7-2",
                exerciseNumber: "Exercise 7.2",
                title: "Section Formula & Midpoint Formula",
                questions: [
                  {
                    id: "q-10-7-2-1",
                    questionNumber: "Question 1",
                    questionText: "Find the coordinates of the point which divides the line segment joining (-1, 7) and (4, -3) in the ratio 2 : 3.",
                    keyConcept: "Section Formula: \\( x = \\frac{m_1 x_2 + m_2 x_1}{m_1 + m_2}, y = \\frac{m_1 y_2 + m_2 y_1}{m_1 + m_2} \\).",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Identify values",
                        content: "\\( (x_1, y_1) = (-1, 7), (x_2, y_2) = (4, -3), m_1 = 2, m_2 = 3 \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Calculate x coordinate",
                        content: "\\( x = \\frac{2(4) + 3(-1)}{2 + 3} = \\frac{8 - 3}{5} = \\frac{5}{5} = 1 \\)."
                      },
                      {
                        stepNumber: 3,
                        title: "Calculate y coordinate",
                        content: "\\( y = \\frac{2(-3) + 3(7)}{2 + 3} = \\frac{-6 + 21}{5} = \\frac{15}{5} = 3 \\)."
                      }
                    ],
                    finalAnswer: "Coordinates of point P = (1, 3)."
                  }
                ]
              }
            ]
          },

          // -------------------------------------------------------------
          // CHAPTER 8: INTRODUCTION TO TRIGONOMETRY
          // -------------------------------------------------------------
          {
            id: "ch-10-8",
            chapterNumber: 8,
            title: "Introduction to Trigonometry",
            titleHindi: "त्रिकोणमिति का परिचय",
            description: "Trigonometric ratios of acute angles, values for 0°, 30°, 45°, 60°, 90°, and fundamental trigonometric identities.",
            icon: "📐",
            color: "#84cc16",
            summary: "Identities: sin²θ + cos²θ = 1, 1 + tan²θ = sec²θ, 1 + cot²θ = cosec²θ. Ratios: sinθ = P/H, cosθ = B/H, tanθ = P/B.",
            exercises: [
              {
                id: "ex-10-8-1",
                exerciseNumber: "Exercise 8.1",
                title: "Trigonometric Ratios in Right Triangles",
                questions: [
                  {
                    id: "q-10-8-1-1",
                    questionNumber: "Question 1",
                    questionText: "In ΔABC, right-angled at B, AB = 24 cm, BC = 7 cm. Determine: (i) sin A, cos A.",
                    keyConcept: "Pythagoras theorem: \\( AC^2 = AB^2 + BC^2 \\). \\( \\sin A = \\frac{\\text{Perpendicular}}{\\text{Hypotenuse}} \\).",
                    diagramSvg: `<svg viewBox="0 0 240 180" style="max-width:100%; height:auto;"><polygon points="40,150 200,150 40,30" fill="none" stroke="#3b82f6" stroke-width="2.5"/><text x="25" y="160" fill="#ffffff" font-size="11" font-weight="bold">B (90°)</text><text x="210" y="160" fill="#ffffff" font-size="11" font-weight="bold">C</text><text x="25" y="25" fill="#ffffff" font-size="11" font-weight="bold">A</text><text x="15" y="90" fill="#10b981" font-size="10">24 cm</text><text x="110" y="170" fill="#10b981" font-size="10">7 cm</text><text x="125" y="80" fill="#ef4444" font-size="10" font-weight="bold">AC = 25 cm</text></svg>`,
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Calculate Hypotenuse AC using Pythagoras theorem",
                        content: "\\( AC = \\sqrt{AB^2 + BC^2} = \\sqrt{24^2 + 7^2} = \\sqrt{576 + 49} = \\sqrt{625} = 25 \\text{ cm} \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Find sin A and cos A",
                        content: "For angle A: Opposite side = BC = 7 cm, Adjacent side = AB = 24 cm, Hypotenuse = AC = 25 cm.\n\\( \\sin A = \\frac{BC}{AC} = \\frac{7}{25} \\)\n\\( \\cos A = \\frac{AB}{AC} = \\frac{24}{25} \\)."
                      }
                    ],
                    finalAnswer: "\\( \\sin A = \\frac{7}{25} \\) and \\( \\cos A = \\frac{24}{25} \\)."
                  }
                ]
              },
              {
                id: "ex-10-8-2",
                exerciseNumber: "Exercise 8.2",
                title: "Trigonometric Identities",
                questions: [
                  {
                    id: "q-10-8-2-1",
                    questionNumber: "Question 1",
                    questionText: "Evaluate: \\( \\sin 60^\\circ \\cos 30^\\circ + \\sin 30^\\circ \\cos 60^\\circ \\).",
                    keyConcept: "Standard values: \\( \\sin 60^\\circ = \\frac{\\sqrt{3}}{2}, \\cos 30^\\circ = \\frac{\\sqrt{3}}{2}, \\sin 30^\\circ = \\frac{1}{2}, \\cos 60^\\circ = \\frac{1}{2} \\).",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Substitute trigonometric values",
                        content: "\\( = \\left(\\frac{\\sqrt{3}}{2}\\right) \\left(\\frac{\\sqrt{3}}{2}\\right) + \\left(\\frac{1}{2}\\right) \\left(\\frac{1}{2}\\right) \\)"
                      },
                      {
                        stepNumber: 2,
                        title: "Simplify products",
                        content: "\\( = \\frac{3}{4} + \\frac{1}{4} = \\frac{4}{4} = 1 \\)."
                      }
                    ],
                    finalAnswer: "Value = 1."
                  }
                ]
              }
            ]
          },

          // -------------------------------------------------------------
          // CHAPTER 9: SOME APPLICATIONS OF TRIGONOMETRY
          // -------------------------------------------------------------
          {
            id: "ch-10-9",
            chapterNumber: 9,
            title: "Some Applications of Trigonometry",
            titleHindi: "त्रिकोणमिति के कुछ अनुप्रयोग",
            description: "Heights and distances problems, line of sight, angle of elevation, and angle of depression.",
            icon: "🗼",
            color: "#a855f7",
            summary: "Use right triangle ratios (especially tanθ = Opposite/Adjacent) to determine heights of towers and distances.",
            exercises: [
              {
                id: "ex-10-9-1",
                exerciseNumber: "Exercise 9.1",
                title: "Heights and Distances Problems",
                questions: [
                  {
                    id: "q-10-9-1-1",
                    questionNumber: "Question 1",
                    questionText: "A tower stands vertically on the ground. From a point on the ground, which is 15 m away from the foot of the tower, the angle of elevation of the top of the tower is found to be 60°. Find the height of the tower.",
                    keyConcept: "\\( \\tan \\theta = \\frac{\\text{Height of Tower}}{\\text{Distance from foot}} \\).",
                    diagramSvg: `<svg viewBox="0 0 240 180" style="max-width:100%; height:auto;"><line x1="30" y1="150" x2="210" y2="150" stroke="#94a3b8" stroke-width="2"/><text x="100" y="168" fill="#10b981" font-size="10">15 m</text><line x1="30" y1="150" x2="30" y2="40" stroke="#ef4444" stroke-width="3"/><text x="15" y="90" fill="#ef4444" font-size="11" font-weight="bold">h</text><line x1="210" y1="150" x2="30" y2="40" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4"/><text x="175" y="145" fill="#f59e0b" font-size="11" font-weight="bold">60°</text></svg>`,
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Formulate tan ratio equation",
                        content: "Let height of tower = h meters.\nDistance from foot = 15 m, Angle of elevation \\( \\theta = 60^\\circ \\).\n\\( \\tan 60^\\circ = \\frac{h}{15} \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Substitute tan 60° = √3 and solve for h",
                        content: "\\( \\sqrt{3} = \\frac{h}{15} \\implies h = 15\\sqrt{3} \\text{ meters} \\)."
                      }
                    ],
                    finalAnswer: "Height of the tower = \\( 15\\sqrt{3} \\text{ m} \\approx 25.98 \\text{ m} \\)."
                  }
                ]
              }
            ]
          },

          // -------------------------------------------------------------
          // CHAPTER 10: CIRCLES
          // -------------------------------------------------------------
          {
            id: "ch-10-10",
            chapterNumber: 10,
            title: "Circles",
            titleHindi: "वृत्त",
            description: "Tangents to a circle, point of contact, and lengths of tangents drawn from an external point.",
            icon: "⭕",
            color: "#f97316",
            summary: "Theorem 10.1: Tangent at any point is perpendicular to radius. Theorem 10.2: Tangents drawn from external point to a circle are equal in length.",
            exercises: [
              {
                id: "ex-10-10-1",
                exerciseNumber: "Exercise 10.1",
                title: "Tangents to a Circle",
                questions: [
                  {
                    id: "q-10-10-1-1",
                    questionNumber: "Question 1",
                    questionText: "A tangent PQ at a point P of a circle of radius 5 cm meets a line through the center O at a point Q so that OQ = 12 cm. Find length PQ.",
                    keyConcept: "Tangent is perpendicular to radius at point of contact (OP ⊥ PQ). Apply Pythagoras theorem in ΔOPQ.",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Identify right triangle OPQ",
                        content: "In right triangle OPQ (angle P = 90°):\nRadius OP = 5 cm, OQ = 12 cm."
                      },
                      {
                        stepNumber: 2,
                        title: "Apply Pythagoras theorem",
                        content: "\\( OQ^2 = OP^2 + PQ^2 \\implies 12^2 = 5^2 + PQ^2 \\implies 144 = 25 + PQ^2 \\)."
                      },
                      {
                        stepNumber: 3,
                        title: "Solve for PQ",
                        content: "\\( PQ^2 = 144 - 25 = 119 \\implies PQ = \\sqrt{119} \\text{ cm} \\)."
                      }
                    ],
                    finalAnswer: "Length \\( PQ = \\sqrt{119} \\text{ cm} \\)."
                  }
                ]
              }
            ]
          },

          // -------------------------------------------------------------
          // CHAPTER 11: AREAS RELATED TO CIRCLES
          // -------------------------------------------------------------
          {
            id: "ch-10-11",
            chapterNumber: 11,
            title: "Areas Related to Circles",
            titleHindi: "वृत्तों से संबंधित क्षेत्रफल",
            description: "Area of sector and segment of a circle, arc length formula.",
            icon: "🍕",
            color: "#6366f1",
            summary: "Area of sector \\( A = \\frac{\\theta}{360^\\circ} \\times \\pi r^2 \\). Length of arc \\( l = \\frac{\\theta}{360^\\circ} \\times 2\\pi r \\).",
            exercises: [
              {
                id: "ex-10-11-1",
                exerciseNumber: "Exercise 11.1",
                title: "Area of Sector & Arc Length",
                questions: [
                  {
                    id: "q-10-11-1-1",
                    questionNumber: "Question 1",
                    questionText: "Find the area of a sector of a circle with radius 6 cm if angle of the sector is 60°.",
                    keyConcept: "\\( \\text{Area of Sector} = \\frac{\\theta}{360^\\circ} \\times \\pi r^2 \\).",
                    diagramSvg: `<svg viewBox="0 0 200 200" style="max-width:100%; height:auto;"><circle cx="100" cy="100" r="70" fill="none" stroke="#3b82f6" stroke-width="2"/><path d="M 100 100 L 170 100 A 70 70 0 0 0 135 39 Z" fill="rgba(239, 68, 68, 0.3)" stroke="#ef4444" stroke-width="2"/><circle cx="100" cy="100" r="4" fill="#ffffff"/><text x="90" y="115" fill="#ffffff" font-size="10">O</text><text x="120" y="85" fill="#ef4444" font-size="10" font-weight="bold">60°</text><text x="130" y="115" fill="#10b981" font-size="10">r=6 cm</text></svg>`,
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Identify r and θ",
                        content: "\\( r = 6 \\text{ cm}, \\theta = 60^\\circ \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Substitute into sector area formula",
                        content: "\\( \\text{Area} = \\frac{60^\\circ}{360^\\circ} \\times \\frac{22}{7} \\times 6^2 = \\frac{1}{6} \\times \\frac{22}{7} \\times 36 = \\frac{132}{7} \\text{ cm}^2 \\)."
                      }
                    ],
                    finalAnswer: "\\( \\frac{132}{7} \\text{ cm}^2 \\approx 18.86 \\text{ cm}^2 \\)."
                  }
                ]
              }
            ]
          },

          // -------------------------------------------------------------
          // CHAPTER 12: SURFACE AREAS AND VOLUMES
          // -------------------------------------------------------------
          {
            id: "ch-10-12",
            chapterNumber: 12,
            title: "Surface Areas and Volumes",
            titleHindi: "पृष्ठीय क्षेत्रफल और आयतन",
            description: "Surface area and volume of combinations of solids (cubes, cylinders, cones, spheres, hemispheres).",
            icon: "📦",
            color: "#14b8a6",
            summary: "Total surface area of combined solid equals sum of curved surface areas of constituent shapes.",
            exercises: [
              {
                id: "ex-10-12-1",
                exerciseNumber: "Exercise 12.1",
                title: "Surface Area of Combined Solids",
                questions: [
                  {
                    id: "q-10-12-1-1",
                    questionNumber: "Question 1",
                    questionText: "2 cubes each of volume 64 cm³ are joined end to end. Find the surface area of the resulting cuboid.",
                    keyConcept: "Volume of cube \\( V = a^3 \\implies a = 4 \\text{ cm} \\). Joined cuboid dimensions: l = 8 cm, b = 4 cm, h = 4 cm.",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Find side 'a' of each cube",
                        content: "\\( a^3 = 64 \\implies a = 4 \\text{ cm} \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Determine dimensions of combined cuboid",
                        content: "Length \\( l = 4 + 4 = 8 \\text{ cm} \\), Breadth \\( b = 4 \\text{ cm} \\), Height \\( h = 4 \\text{ cm} \\)."
                      },
                      {
                        stepNumber: 3,
                        title: "Apply Surface Area of Cuboid formula",
                        content: "\\( \\text{TSA} = 2(lb + bh + hl) = 2(8 \\times 4 + 4 \\times 4 + 4 \\times 8) = 2(32 + 16 + 32) = 2(80) = 160 \\text{ cm}^2 \\)."
                      }
                    ],
                    finalAnswer: "Surface area of the resulting cuboid = \\( 160 \\text{ cm}^2 \\)."
                  }
                ]
              }
            ]
          },

          // -------------------------------------------------------------
          // CHAPTER 13: STATISTICS
          // -------------------------------------------------------------
          {
            id: "ch-10-13",
            chapterNumber: 13,
            title: "Statistics",
            titleHindi: "सांख्यिकी",
            description: "Mean (Direct & Assumed Mean method), Mode, and Median of grouped frequency distribution data.",
            icon: "📊",
            color: "#3b82f6",
            summary: "Empirical relationship between measures of central tendency: Mode = 3 Median - 2 Mean.",
            exercises: [
              {
                id: "ex-10-13-1",
                exerciseNumber: "Exercise 13.1",
                title: "Mean of Grouped Data",
                questions: [
                  {
                    id: "q-10-13-1-1",
                    questionNumber: "Question 1",
                    questionText: "A survey was conducted by a group of students regarding plant counts in 20 houses. Find the mean number of plants per house:\n\nPlants: 0-2 (1), 2-4 (2), 4-6 (1), 6-8 (5), 8-10 (6), 10-12 (2), 12-14 (3).",
                    keyConcept: "Direct Method for Mean: \\( \\bar{x} = \\frac{\\sum f_i x_i}{\\sum f_i} \\).",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Calculate class marks x_i and f_i * x_i",
                        content: "0-2: x₁=1, f₁=1, f₁x₁=1\n2-4: x₂=3, f₂=2, f₂x₂=6\n4-6: x₃=5, f₃=1, f₃x₃=5\n6-8: x₄=7, f₄=5, f₄x₄=35\n8-10: x₅=9, f₅=6, f₅x₅=54\n10-12: x₆=11, f₆=2, f₆x₆=22\n12-14: x₇=13, f₇=3, f₇x₇=39"
                      },
                      {
                        stepNumber: 2,
                        title: "Compute totals",
                        content: "\\( \\sum f_i = 20 \\)\n\\( \\sum f_i x_i = 162 \\)."
                      },
                      {
                        stepNumber: 3,
                        title: "Calculate Mean",
                        content: "\\( \\bar{x} = \\frac{162}{20} = 8.1 \\text{ plants} \\)."
                      }
                    ],
                    finalAnswer: "Mean number of plants per house = 8.1."
                  }
                ]
              }
            ]
          },

          // -------------------------------------------------------------
          // CHAPTER 14: PROBABILITY
          // -------------------------------------------------------------
          {
            id: "ch-10-14",
            chapterNumber: 14,
            title: "Probability",
            titleHindi: "प्रायिकता",
            description: "Classical definition of probability P(E) = Number of outcomes favorable to E / Total number of possible outcomes.",
            icon: "🎲",
            color: "#10b981",
            summary: "0 ≤ P(E) ≤ 1. Sum of probabilities of all elementary events is 1. P(E) + P(not E) = 1.",
            exercises: [
              {
                id: "ex-10-14-1",
                exerciseNumber: "Exercise 14.1",
                title: "Theoretical Probability & Card/Dice Problems",
                questions: [
                  {
                    id: "q-10-14-1-1",
                    questionNumber: "Question 1",
                    questionText: "Complete the following statements:\n(i) Probability of an event E + Probability of the event 'not E' = ___.\n(ii) The probability of an event that cannot happen is ___.\n(iii) The sum of the probabilities of all the elementary events of an experiment is ___.",
                    keyConcept: "Fundamental properties of classical probability.",
                    difficulty: "Easy",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Analyze Part (i)",
                        content: "Complementary events sum to 1: \\( P(E) + P(\\bar{E}) = 1 \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Analyze Part (ii)",
                        content: "An impossible event has probability 0."
                      },
                      {
                        stepNumber: 3,
                        title: "Analyze Part (iii)",
                        content: "The sum of probabilities of all elementary events in a sample space equals 1."
                      }
                    ],
                    finalAnswer: "(i) 1, (ii) 0 (Impossible event), (iii) 1."
                  },
                  {
                    id: "q-10-14-1-2",
                    questionNumber: "Question 2",
                    questionText: "One card is drawn from a well-shuffled deck of 52 cards. Find the probability of getting: (i) a king of red color, (ii) a face card.",
                    keyConcept: "\\( P(E) = \\frac{\\text{Favorable outcomes}}{\\text{Total outcomes (52)}} \\).",
                    difficulty: "Medium",
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Calculate Part (i): King of red color",
                        content: "Red kings = King of Hearts + King of Diamonds = 2.\n\\( P(\\text{Red King}) = \\frac{2}{52} = \\frac{1}{26} \\)."
                      },
                      {
                        stepNumber: 2,
                        title: "Calculate Part (ii): Face card",
                        content: "Face cards = 4 Kings + 4 Queens + 4 Jacks = 12 cards.\n\\( P(\\text{Face Card}) = \\frac{12}{52} = \\frac{3}{13} \\)."
                      }
                    ],
                    finalAnswer: "(i) \\( \\frac{1}{26} \\), (ii) \\( \\frac{3}{13} \\)."
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
  "id": "class-11",
  "classNumber": 11,
  "label": "Class 11th",
  "cbseBookTitle": "NCERT Mathematics Class 11 (गणित कक्षा 11)",
  "subjects": [
    {
      "id": "maths",
      "name": "📐 Mathematics (गणित)",
      "code": "MATH11",
      "icon": "📐",
      "chapters": [
        {
          "id": "ch-11-1",
          "chapterNumber": 1,
          "title": "Sets",
          "titleHindi": "समुच्चय",
          "description": "Concepts of sets, roster & set-builder notation, empty set, subsets, power set, Venn diagrams, union and intersection.",
          "icon": "⭕",
          "color": "from-blue-600 to-indigo-600",
          "summary": "A set is a well-defined collection of distinct objects. Basic operations include Union (A ∪ B), Intersection (A ∩ B), and Difference (A - B).",
          "exercises": [
            {
              "id": "ex-11-1-1",
              "exerciseNumber": "Exercise 1.1",
              "title": "Set Representation & Identification",
              "questions": [
                {
                  "id": "q-11-1-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Which of the following are sets? Justify your answer:\n(i) The collection of all the months of a year beginning with the letter J.\n(ii) The collection of ten most talented writers of India.",
                  "keyConcept": "A collection is a set if it is well-defined (independent of individual opinion).",
                  "difficulty": "Easy",
                  "diagramSvg": "<svg viewBox=\"0 0 300 200\" width=\"100%\" height=\"180\" xmlns=\"http://www.w3.org/2000/svg\">\n  <rect x=\"10\" y=\"10\" width=\"280\" height=\"180\" rx=\"10\" fill=\"none\" stroke=\"#64748b\" stroke-width=\"2\" stroke-dasharray=\"4\"/>\n  <text x=\"25\" y=\"35\" fill=\"#64748b\" font-weight=\"bold\" font-size=\"14\">U (Universal Set)</text>\n  <circle cx=\"110\" cy=\"110\" r=\"55\" fill=\"rgba(37, 99, 235, 0.25)\" stroke=\"#2563eb\" stroke-width=\"2\"/>\n  <circle cx=\"190\" cy=\"110\" r=\"55\" fill=\"rgba(239, 68, 68, 0.25)\" stroke=\"#ef4444\" stroke-width=\"2\"/>\n  <text x=\"90\" y=\"115\" fill=\"#2563eb\" font-weight=\"bold\" font-size=\"16\">Set A</text>\n  <text x=\"185\" y=\"115\" fill=\"#ef4444\" font-weight=\"bold\" font-size=\"16\">Set B</text>\n  <text x=\"140\" y=\"115\" fill=\"#10b981\" font-weight=\"bold\" font-size=\"13\">A ∩ B</text>\n</svg>",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Analyze Part (i)",
                      "content": "Months starting with 'J' are January, June, July. This collection is well-defined and universally agreed upon, so it IS a set."
                    },
                    {
                      "stepNumber": 2,
                      "title": "Analyze Part (ii)",
                      "content": "The criterion for 'most talented' varies from person to person. It is not well-defined, so it IS NOT a set."
                    }
                  ],
                  "finalAnswer": "(i) Yes, it is a set: \\(\\{ \\text{January, June, July} \\}\\). (ii) No, not a set (subjective)."
                },
                {
                  "id": "q-11-1-1-2",
                  "questionNumber": "Question 2",
                  "questionText": "Write the following sets in roster form:\n(i) \\( A = \\{ x : x \\text{ is an integer and } -3 < x < 7 \\} \\)\n(ii) \\( B = \\{ x : x \\text{ is a natural number less than 6} \\} \\).",
                  "keyConcept": "Roster form lists all elements explicitly separated by commas inside braces.",
                  "difficulty": "Easy",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Find elements for Set A",
                      "content": "Integers strictly between -3 and 7 are: -2, -1, 0, 1, 2, 3, 4, 5, 6."
                    },
                    {
                      "stepNumber": 2,
                      "title": "Find elements for Set B",
                      "content": "Natural numbers less than 6 are: 1, 2, 3, 4, 5."
                    }
                  ],
                  "finalAnswer": "(i) \\( A = \\{-2, -1, 0, 1, 2, 3, 4, 5, 6\\} \\), (ii) \\( B = \\{1, 2, 3, 4, 5\\} \\)."
                }
              ]
            },
            {
              "id": "ex-11-1-2",
              "exerciseNumber": "Exercise 1.2",
              "title": "Empty Set, Subsets & Set Operations",
              "questions": [
                {
                  "id": "q-11-1-2-1",
                  "questionNumber": "Question 1",
                  "questionText": "If \\( A = \\{1, 2, 3, 4, 5, 6\\} \\), \\( B = \\{2, 4, 6, 8\\} \\), find: (i) \\( A \\cup B \\), (ii) \\( A \\cap B \\), (iii) \\( A - B \\).",
                  "keyConcept": "Union combines all unique elements; Intersection takes common elements; Difference removes B's elements from A.",
                  "difficulty": "Medium",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Calculate Union A ∪ B",
                      "content": "Combine elements from both sets: \\( A \\cup B = \\{1, 2, 3, 4, 5, 6, 8\\} \\)."
                    },
                    {
                      "stepNumber": 2,
                      "title": "Calculate Intersection A ∩ B",
                      "content": "Common elements present in both A and B are: \\( \\{2, 4, 6\\} \\)."
                    },
                    {
                      "stepNumber": 3,
                      "title": "Calculate Difference A - B",
                      "content": "Elements in A that are not in B: \\( \\{1, 3, 5\\} \\)."
                    }
                  ],
                  "finalAnswer": "(i) \\( \\{1, 2, 3, 4, 5, 6, 8\\} \\), (ii) \\( \\{2, 4, 6\\} \\), (iii) \\( \\{1, 3, 5\\} \\)."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-11-2",
          "chapterNumber": 2,
          "title": "Relations and Functions",
          "titleHindi": "संबंध एवं फलन",
          "description": "Cartesian product of sets, relations, domain, range, functions and algebraic operations on functions.",
          "icon": "🔗",
          "color": "from-purple-600 to-pink-600",
          "summary": "A relation R from set A to set B is a subset of A × B. A function f: A → B assigns every element in A to a unique element in B.",
          "exercises": [
            {
              "id": "ex-11-2-1",
              "exerciseNumber": "Exercise 2.1",
              "title": "Cartesian Product of Sets",
              "questions": [
                {
                  "id": "q-11-2-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "If \\( \\left(\\frac{x}{3} + 1, y - \\frac{2}{3}\\right) = \\left(\\frac{5}{3}, \\frac{1}{3}\\right) \\), find the values of \\( x \\) and \\( y \\).",
                  "keyConcept": "Two ordered pairs are equal if and only if corresponding elements are equal.",
                  "difficulty": "Easy",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Equate the x-coordinates",
                      "content": "\\[ \\frac{x}{3} + 1 = \\frac{5}{3} \\implies \\frac{x}{3} = \\frac{5}{3} - 1 = \\frac{2}{3} \\implies x = 2 \\]"
                    },
                    {
                      "stepNumber": 2,
                      "title": "Equate the y-coordinates",
                      "content": "\\[ y - \\frac{2}{3} = \\frac{1}{3} \\implies y = \\frac{1}{3} + \\frac{2}{3} = 1 \\]"
                    }
                  ],
                  "finalAnswer": "\\( x = 2, y = 1 \\)."
                }
              ]
            },
            {
              "id": "ex-11-2-2",
              "exerciseNumber": "Exercise 2.2",
              "title": "Domain, Codomain & Range of Functions",
              "questions": [
                {
                  "id": "q-11-2-2-1",
                  "questionNumber": "Question 1",
                  "questionText": "Find the domain and range of the real function \\( f(x) = -|x| \\).",
                  "keyConcept": "Absolute value function \\( |x| \\ge 0 \\) for all real \\( x \\).",
                  "difficulty": "Medium",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Determine Domain",
                      "content": "\\( -|x| \\) is defined for all real numbers \\( x \\in \\mathbb{R} \\). Thus, \\( \\text{Domain} = \\mathbb{R} \\)."
                    },
                    {
                      "stepNumber": 2,
                      "title": "Determine Range",
                      "content": "Since \\( |x| \\ge 0 \\), multiplying by -1 yields \\( -|x| \\le 0 \\). Thus, \\( \\text{Range} = (-\\infty, 0] \\)."
                    }
                  ],
                  "finalAnswer": "Domain: \\( \\mathbb{R} \\), Range: \\( (-\\infty, 0] \\)."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-11-3",
          "chapterNumber": 3,
          "title": "Trigonometric Functions",
          "titleHindi": "त्रिकोणमितीय फलन",
          "description": "Radian measure, trigonometric ratios, quadrant signs, identities, sum and difference formulas.",
          "icon": "📐",
          "color": "from-emerald-600 to-teal-600",
          "summary": "1 Radian = 180°/π. Key formulas include cos²x + sin²x = 1, sin(A ± B) = sin A cos B ± cos A sin B.",
          "exercises": [
            {
              "id": "ex-11-3-1",
              "exerciseNumber": "Exercise 3.1",
              "title": "Radian and Degree Measure Conversions",
              "questions": [
                {
                  "id": "q-11-3-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Find the radian measure corresponding to 25°.",
                  "keyConcept": "\\( \\text{Radian measure} = \\frac{\\pi}{180^\\circ} \\times \\text{Degree measure} \\).",
                  "difficulty": "Easy",
                  "diagramSvg": "<svg viewBox=\"0 0 300 240\" width=\"100%\" height=\"200\" xmlns=\"http://www.w3.org/2000/svg\">\n  <line x1=\"20\" y1=\"120\" x2=\"280\" y2=\"120\" stroke=\"#64748b\" stroke-width=\"1.5\"/>\n  <line x1=\"150\" y1=\"20\" x2=\"150\" y2=\"220\" stroke=\"#64748b\" stroke-width=\"1.5\"/>\n  <circle cx=\"150\" cy=\"120\" r=\"80\" fill=\"none\" stroke=\"#3b82f6\" stroke-width=\"2.5\"/>\n  <line x1=\"150\" y1=\"120\" x2=\"206\" y2=\"64\" stroke=\"#ef4444\" stroke-width=\"2.5\"/>\n  <circle cx=\"206\" cy=\"64\" r=\"4\" fill=\"#ef4444\"/>\n  <text x=\"212\" y=\"60\" fill=\"#ef4444\" font-weight=\"bold\" font-size=\"13\">P(cos θ, sin θ)</text>\n  <path d=\"M 175 120 A 25 25 0 0 0 168 102\" fill=\"none\" stroke=\"#f59e0b\" stroke-width=\"2\"/>\n  <text x=\"178\" y=\"110\" fill=\"#f59e0b\" font-weight=\"bold\" font-size=\"14\">θ</text>\n</svg>",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Apply conversion formula",
                      "content": "\\[ \\text{Radian} = \\frac{\\pi}{180} \\times 25 = \\frac{5\\pi}{36} \\text{ radians} \\]"
                    }
                  ],
                  "finalAnswer": "\\( \\frac{5\\pi}{36} \\text{ radians} \\)."
                },
                {
                  "id": "q-11-3-1-2",
                  "questionNumber": "Question 2",
                  "questionText": "If \\( \\cos x = -\\frac{1}{2} \\) and \\( x \\) lies in the third quadrant, find the values of other 5 trigonometric functions.",
                  "keyConcept": "In Quadrant III, tan and cot are positive; sin, cos, sec, cosec are negative.",
                  "difficulty": "Medium",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Calculate sin x",
                      "content": "\\( \\sin^2 x = 1 - \\cos^2 x = 1 - \\frac{1}{4} = \\frac{3}{4} \\). Since x is in Q-III, \\( \\sin x = -\\frac{\\sqrt{3}}{2} \\)."
                    },
                    {
                      "stepNumber": 2,
                      "title": "Calculate tan x, cot x, sec x, cosec x",
                      "content": "\\( \\tan x = \\frac{\\sin x}{\\cos x} = \\sqrt{3} \\), \\( \\cot x = \\frac{1}{\\sqrt{3}} \\), \\( \\sec x = -2 \\), \\( \\csc x = -\\frac{2}{\\sqrt{3}} \\)."
                    }
                  ],
                  "finalAnswer": "\\( \\sin x = -\\frac{\\sqrt{3}}{2} \\), \\( \\tan x = \\sqrt{3} \\), \\( \\cot x = \\frac{1}{\\sqrt{3}} \\), \\( \\sec x = -2 \\), \\( \\csc x = -\\frac{2}{\\sqrt{3}} \\)."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-11-4",
          "chapterNumber": 4,
          "title": "Complex Numbers & Quadratic Equations",
          "titleHindi": "सम्मिश्र संख्याएं और द्विघातीय समीकरण",
          "description": "Imaginary unit i, complex algebra z = a + ib, modulus |z|, conjugate z̄, quadratic equations with negative discriminant.",
          "icon": "🔢",
          "color": "from-amber-600 to-orange-600",
          "summary": "i² = -1. For z = a + ib, Modulus |z| = √(a² + b²), Conjugate z̄ = a - ib. Roots of ax² + bx + c = 0 are x = (-b ± √(b² - 4ac)) / (2a).",
          "exercises": [
            {
              "id": "ex-11-4-1",
              "exerciseNumber": "Exercise 4.1",
              "title": "Complex Algebra & Powers of i",
              "questions": [
                {
                  "id": "q-11-4-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Express in the form \\( a + ib \\): \\( (5i) \\left(-\\frac{3}{5}i\\right) \\).",
                  "keyConcept": "Multiply real coefficients and powers of \\( i \\) where \\( i^2 = -1 \\).",
                  "difficulty": "Easy",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Multiply terms",
                      "content": "\\[ (5i) \\left(-\\frac{3}{5}i\\right) = 5 \\times \\left(-\\frac{3}{5}\\right) \\times i^2 = -3 \\times (-1) = 3 \\]"
                    },
                    {
                      "stepNumber": 2,
                      "title": "Write in standard form",
                      "content": "\\[ 3 + 0i \\]"
                    }
                  ],
                  "finalAnswer": "\\( 3 + 0i \\)."
                },
                {
                  "id": "q-11-4-1-2",
                  "questionNumber": "Question 2",
                  "questionText": "Solve the quadratic equation: \\( x^2 + 3 = 0 \\).",
                  "keyConcept": "For negative discriminant, roots are imaginary: \\( \\sqrt{-k} = i\\sqrt{k} \\).",
                  "difficulty": "Easy",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Isolate x²",
                      "content": "\\[ x^2 = -3 \\implies x = \\pm \\sqrt{-3} = \\pm i\\sqrt{3} \\]"
                    }
                  ],
                  "finalAnswer": "\\( x = \\pm i\\sqrt{3} \\)."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-11-5",
          "chapterNumber": 5,
          "title": "Linear Inequalities",
          "titleHindi": "रेखीय असमिकाएं",
          "description": "Algebraic solutions of linear inequalities in one variable and number line representation.",
          "icon": "⚖️",
          "color": "from-cyan-600 to-blue-600",
          "summary": "Multiplying or dividing an inequality by a negative number reverses the inequality sign.",
          "exercises": [
            {
              "id": "ex-11-5-1",
              "exerciseNumber": "Exercise 5.1",
              "title": "Solving Linear Inequalities",
              "questions": [
                {
                  "id": "q-11-5-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Solve \\( 24x < 100 \\) when:\n(i) \\( x \\) is a natural number.\n(ii) \\( x \\) is an integer.",
                  "keyConcept": "Divide both sides by 24 (positive number maintains inequality direction).",
                  "difficulty": "Easy",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Simplify inequality",
                      "content": "\\[ x < \\frac{100}{24} = \\frac{25}{6} \\approx 4.167 \\]"
                    },
                    {
                      "stepNumber": 2,
                      "title": "Solve for Part (i): Natural numbers",
                      "content": "Natural numbers strictly less than 4.167 are \\( \\{1, 2, 3, 4\\} \\)."
                    },
                    {
                      "stepNumber": 3,
                      "title": "Solve for Part (ii): Integers",
                      "content": "Integers strictly less than 4.167 are \\( \\{..., -2, -1, 0, 1, 2, 3, 4\\} \\)."
                    }
                  ],
                  "finalAnswer": "(i) \\( \\{1, 2, 3, 4\\} \\), (ii) \\( \\{..., -2, -1, 0, 1, 2, 3, 4\\} \\)."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-11-6",
          "chapterNumber": 6,
          "title": "Permutations and Combinations",
          "titleHindi": "क्रमचय और संचय",
          "description": "Fundamental Counting Principle, Factorial n!, Permutations P(n,r) and Combinations C(n,r).",
          "icon": "🎲",
          "color": "from-red-600 to-rose-600",
          "summary": "Permutations deal with arrangements (order matters): P(n,r) = n!/(n-r)!. Combinations deal with selections (order ignored): C(n,r) = n!/(r!(n-r)!).",
          "exercises": [
            {
              "id": "ex-11-6-1",
              "exerciseNumber": "Exercise 6.1",
              "title": "Permutations and Combinations Evaluation",
              "questions": [
                {
                  "id": "q-11-6-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "How many 3-digit numbers can be formed from the digits 1, 2, 3, 4 and 5 assuming:\n(i) repetition of digits is allowed?\n(ii) repetition of digits is not allowed?",
                  "keyConcept": "Fundamental Principle of Multiplication.",
                  "difficulty": "Medium",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Part (i): Repetition allowed",
                      "content": "Units, tens, and hundreds places can each be filled in 5 ways: \\( 5 \\times 5 \\times 5 = 125 \\)."
                    },
                    {
                      "stepNumber": 2,
                      "title": "Part (ii): Repetition not allowed",
                      "content": "Hundreds place: 5 options, Tens place: 4 options, Units place: 3 options: \\( 5 \\times 4 \\times 3 = 60 \\)."
                    }
                  ],
                  "finalAnswer": "(i) 125 numbers, (ii) 60 numbers."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-11-7",
          "chapterNumber": 7,
          "title": "Binomial Theorem",
          "titleHindi": "द्विपद प्रमेय",
          "description": "Binomial expansion for positive integral index, Pascal's triangle and general term.",
          "icon": "📊",
          "color": "from-yellow-600 to-amber-600",
          "summary": "(a + b)ⁿ = ∑ C(n, k) aⁿ⁻ᵏ bᵏ for k from 0 to n.",
          "exercises": [
            {
              "id": "ex-11-7-1",
              "exerciseNumber": "Exercise 7.1",
              "title": "Binomial Expansion Problems",
              "questions": [
                {
                  "id": "q-11-7-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Expand the expression: \\( (1 - 2x)^5 \\).",
                  "keyConcept": "Apply binomial theorem with \\( a = 1, b = -2x, n = 5 \\).",
                  "difficulty": "Medium",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Write expansion terms",
                      "content": "\\[ (1 - 2x)^5 = \\binom{5}{0}(1)^5 + \\binom{5}{1}(1)^4(-2x) + \\binom{5}{2}(1)^3(-2x)^2 + \\binom{5}{3}(1)^2(-2x)^3 + \\binom{5}{4}(1)(-2x)^4 + \\binom{5}{5}(-2x)^5 \\]"
                    },
                    {
                      "stepNumber": 2,
                      "title": "Compute coefficients",
                      "content": "\\[ = 1 - 5(2x) + 10(4x^2) - 10(8x^3) + 5(16x^4) - 32x^5 \\]"
                    }
                  ],
                  "finalAnswer": "\\( 1 - 10x + 40x^2 - 80x^3 + 80x^4 - 32x^5 \\)."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-11-8",
          "chapterNumber": 8,
          "title": "Sequences and Series",
          "titleHindi": "अनुक्रम तथा श्रेणी",
          "description": "Geometric Progression (GP), nth term a_n = arⁿ⁻¹, sum S_n = a(rⁿ - 1)/(r - 1), infinite GP.",
          "icon": "📈",
          "color": "from-teal-600 to-emerald-600",
          "summary": "For a GP with initial term a and common ratio r, S_∞ = a / (1 - r) for |r| < 1.",
          "exercises": [
            {
              "id": "ex-11-8-1",
              "exerciseNumber": "Exercise 8.1",
              "title": "Geometric Progression (GP) Problems",
              "questions": [
                {
                  "id": "q-11-8-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Find the 20th and nth terms of the GP: \\( \\frac{5}{2}, \\frac{5}{4}, \\frac{5}{8}, \\dots \\)",
                  "keyConcept": "First term \\( a = 5/2 \\), common ratio \\( r = 1/2 \\).",
                  "difficulty": "Easy",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Find nth term formula",
                      "content": "\\[ a_n = a r^{n-1} = \\frac{5}{2} \\left(\\frac{1}{2}\\right)^{n-1} = \\frac{5}{2^n} \\]"
                    },
                    {
                      "stepNumber": 2,
                      "title": "Find 20th term",
                      "content": "\\[ a_{20} = \\frac{5}{2^{20}} \\]"
                    }
                  ],
                  "finalAnswer": "\\( a_{20} = \\frac{5}{2^{20}} \\), \\( a_n = \\frac{5}{2^n} \\)."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-11-9",
          "chapterNumber": 9,
          "title": "Straight Lines",
          "titleHindi": "सरल रेखाएं",
          "description": "Slope of a line m = tan θ, point-slope form, slope-intercept form, distance of a point from line d = |ax₁ + by₁ + c|/√(a² + b²).",
          "icon": "📏",
          "color": "from-indigo-600 to-purple-600",
          "summary": "Parallel lines have equal slopes (m₁ = m₂). Perpendicular lines have m₁ · m₂ = -1.",
          "exercises": [
            {
              "id": "ex-11-9-1",
              "exerciseNumber": "Exercise 9.1",
              "title": "Slope and Equation of a Line",
              "questions": [
                {
                  "id": "q-11-9-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Find the equation of the line passing through \\( (2, 3) \\) with slope \\( m = 4 \\).",
                  "keyConcept": "Point-slope form: \\( y - y_1 = m(x - x_1) \\).",
                  "difficulty": "Easy",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Substitute into formula",
                      "content": "\\[ y - 3 = 4(x - 2) \\implies y - 3 = 4x - 8 \\implies 4x - y - 5 = 0 \\]"
                    }
                  ],
                  "finalAnswer": "\\( 4x - y - 5 = 0 \\)."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-11-10",
          "chapterNumber": 10,
          "title": "Conic Sections",
          "titleHindi": "शंकु परिच्छेद",
          "description": "Standard equations of Circle (x-h)² + (y-k)² = r², Parabola y² = 4ax, Ellipse x²/a² + y²/b² = 1, Hyperbola x²/a² - y²/b² = 1.",
          "icon": "⭕",
          "color": "from-violet-600 to-indigo-600",
          "summary": "Conic sections are curves formed by intersecting a double cone with a plane.",
          "exercises": [
            {
              "id": "ex-11-10-1",
              "exerciseNumber": "Exercise 10.1",
              "title": "Parabola Equations and Focus",
              "questions": [
                {
                  "id": "q-11-10-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Find the coordinates of the focus, axis of the parabola, equation of directrix and length of latus rectum for \\( y^2 = 12x \\).",
                  "keyConcept": "Compare with standard form \\( y^2 = 4ax \\).",
                  "difficulty": "Medium",
                  "diagramSvg": "<svg viewBox=\"0 0 300 220\" width=\"100%\" height=\"180\" xmlns=\"http://www.w3.org/2000/svg\">\n  <line x1=\"20\" y1=\"110\" x2=\"280\" y2=\"110\" stroke=\"#64748b\" stroke-width=\"1.5\"/>\n  <line x1=\"70\" y1=\"20\" x2=\"70\" y2=\"200\" stroke=\"#64748b\" stroke-width=\"1.5\"/>\n  <path d=\"M 230 30 Q 70 110 230 190\" fill=\"none\" stroke=\"#8b5cf6\" stroke-width=\"3\"/>\n  <circle cx=\"140\" cy=\"110\" r=\"4\" fill=\"#ef4444\"/>\n  <text x=\"135\" y=\"130\" fill=\"#ef4444\" font-weight=\"bold\" font-size=\"13\">Focus (a, 0)</text>\n  <line x1=\"30\" y1=\"20\" x2=\"30\" y2=\"200\" stroke=\"#10b981\" stroke-width=\"2\" stroke-dasharray=\"4\"/>\n  <text x=\"10\" y=\"215\" fill=\"#10b981\" font-weight=\"bold\" font-size=\"12\">Directrix: x = -a</text>\n</svg>",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Find parameter a",
                      "content": "\\[ 4a = 12 \\implies a = 3 \\]"
                    },
                    {
                      "stepNumber": 2,
                      "title": "Determine characteristics",
                      "content": "Focus: \\( (a, 0) = (3, 0) \\)\nAxis: X-axis (y = 0)\nDirectrix: \\( x = -a \\implies x = -3 \\)\nLength of Latus Rectum: \\( 4a = 12 \\)."
                    }
                  ],
                  "finalAnswer": "Focus: \\( (3, 0) \\), Directrix: \\( x = -3 \\), Latus Rectum: 12."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-11-11",
          "chapterNumber": 11,
          "title": "Introduction to 3D Geometry",
          "titleHindi": "त्रिविमीय ज्यामिति का परिचय",
          "description": "3D Coordinate axes, octants, distance between two points P(x₁, y₁, z₁) and Q(x₂, y₂, z₂).",
          "icon": "🧊",
          "color": "from-sky-600 to-blue-600",
          "summary": "Distance PQ = √((x₂ - x₁)² + (y₂ - y₁)² + (z₂ - z₁)²).",
          "exercises": [
            {
              "id": "ex-11-11-1",
              "exerciseNumber": "Exercise 11.1",
              "title": "3D Distance Formula",
              "questions": [
                {
                  "id": "q-11-11-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Find the distance between the points \\( (2, 3, 5) \\) and \\( (4, 3, 1) \\).",
                  "keyConcept": "Apply 3D distance formula: \\( d = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2 + (z_2-z_1)^2} \\).",
                  "difficulty": "Easy",
                  "diagramSvg": "<svg viewBox=\"0 0 300 240\" width=\"100%\" height=\"200\" xmlns=\"http://www.w3.org/2000/svg\">\n  <line x1=\"150\" y1=\"120\" x2=\"280\" y2=\"120\" stroke=\"#ef4444\" stroke-width=\"2.5\"/>\n  <text x=\"270\" y=\"140\" fill=\"#ef4444\" font-weight=\"bold\" font-size=\"14\">Y-axis</text>\n  <line x1=\"150\" y1=\"120\" x2=\"150\" y2=\"20\" stroke=\"#2563eb\" stroke-width=\"2.5\"/>\n  <text x=\"160\" y=\"35\" fill=\"#2563eb\" font-weight=\"bold\" font-size=\"14\">Z-axis</text>\n  <line x1=\"150\" y1=\"120\" x2=\"40\" y2=\"200\" stroke=\"#10b981\" stroke-width=\"2.5\"/>\n  <text x=\"25\" y=\"215\" fill=\"#10b981\" font-weight=\"bold\" font-size=\"14\">X-axis</text>\n  <circle cx=\"210\" cy=\"70\" r=\"5\" fill=\"#f59e0b\"/>\n  <text x=\"220\" y=\"65\" fill=\"#f59e0b\" font-weight=\"bold\" font-size=\"13\">P(x, y, z)</text>\n</svg>",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Substitute point coordinates",
                      "content": "\\[ d = \\sqrt{(4 - 2)^2 + (3 - 3)^2 + (1 - 5)^2} = \\sqrt{2^2 + 0^2 + (-4)^2} = \\sqrt{4 + 16} = \\sqrt{20} = 2\\sqrt{5} \\]"
                    }
                  ],
                  "finalAnswer": "\\( 2\\sqrt{5} \\) units."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-11-12",
          "chapterNumber": 12,
          "title": "Limits and Derivatives",
          "titleHindi": "सीमा और अवकलज",
          "description": "Intuitive concept of limit, standard limits (lim x->0 sin x / x = 1), differentiation using First Principle and product/quotient rules.",
          "icon": "⚡",
          "color": "from-blue-600 to-indigo-600",
          "summary": "d/dx (xⁿ) = n xⁿ⁻¹, d/dx (sin x) = cos x, Product rule d/dx (uv) = u'v + uv'.",
          "exercises": [
            {
              "id": "ex-11-12-1",
              "exerciseNumber": "Exercise 12.1",
              "title": "Evaluation of Limits & Derivatives",
              "questions": [
                {
                  "id": "q-11-12-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Evaluate: \\( \\lim_{x \\to 0} \\frac{\\sin 4x}{\\sin 2x} \\).",
                  "keyConcept": "Use standard limit \\( \\lim_{\\theta \\to 0} \\frac{\\sin \\theta}{\\theta} = 1 \\).",
                  "difficulty": "Medium",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Rewrite terms",
                      "content": "\\[ \\lim_{x \\to 0} \\frac{\\frac{\\sin 4x}{4x} \\cdot 4x}{\\frac{\\sin 2x}{2x} \\cdot 2x} = \\frac{1 \\cdot 4x}{1 \\cdot 2x} = 2 \\]"
                    }
                  ],
                  "finalAnswer": "2."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-11-13",
          "chapterNumber": 13,
          "title": "Statistics",
          "titleHindi": "सांख्यिकी",
          "description": "Measures of dispersion, mean deviation, variance σ² = 1/N ∑(x_i - x̄)², standard deviation σ.",
          "icon": "📉",
          "color": "from-emerald-600 to-green-600",
          "summary": "Standard deviation measures the spread of observations relative to their mean.",
          "exercises": [
            {
              "id": "ex-11-13-1",
              "exerciseNumber": "Exercise 13.1",
              "title": "Variance and Standard Deviation",
              "questions": [
                {
                  "id": "q-11-13-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Find the mean and variance of the first 5 natural numbers: 1, 2, 3, 4, 5.",
                  "keyConcept": "Mean \\( \\bar{x} = \\frac{\\sum x_i}{N} \\), Variance \\( \\sigma^2 = \\frac{\\sum (x_i - \\bar{x})^2}{N} \\).",
                  "difficulty": "Easy",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Calculate Mean",
                      "content": "\\[ \\bar{x} = \\frac{1 + 2 + 3 + 4 + 5}{5} = 3 \\]"
                    },
                    {
                      "stepNumber": 2,
                      "title": "Calculate Variance",
                      "content": "\\[ \\sigma^2 = \\frac{(1-3)^2 + (2-3)^2 + (3-3)^2 + (4-3)^2 + (5-3)^2}{5} = \\frac{4 + 1 + 0 + 1 + 4}{5} = \\frac{10}{5} = 2 \\]"
                    }
                  ],
                  "finalAnswer": "Mean = 3, Variance = 2."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-11-14",
          "chapterNumber": 14,
          "title": "Probability",
          "titleHindi": "प्रायिकता",
          "description": "Sample spaces, events, mutually exclusive events, exhaustive events, axiomatic probability P(A ∪ B) = P(A) + P(B) - P(A ∩ B).",
          "icon": "🎯",
          "color": "from-rose-600 to-pink-600",
          "summary": "P(E) = n(E) / n(S). Complementary rule: P(E') = 1 - P(E).",
          "exercises": [
            {
              "id": "ex-11-14-1",
              "exerciseNumber": "Exercise 14.1",
              "title": "Sample Space and Axiomatic Probability",
              "questions": [
                {
                  "id": "q-11-14-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "A coin is tossed three times. Describe the sample space S.",
                  "keyConcept": "Total outcomes for n coin tosses is 2ⁿ.",
                  "difficulty": "Easy",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "List all outcomes",
                      "content": "Sample space \\( S = \\{HHH, HHT, HTH, HTT, THH, THT, TTH, TTT\\} \\)."
                    }
                  ],
                  "finalAnswer": "\\( S = \\{HHH, HHT, HTH, HTT, THH, THT, TTH, TTT\\} \\) (Total 8 outcomes)."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
},
  {
  "id": "class-12",
  "classNumber": 12,
  "label": "Class 12th",
  "cbseBookTitle": "NCERT Mathematics Class 12 (गणित कक्षा 12)",
  "subjects": [
    {
      "id": "maths",
      "name": "📐 Mathematics (गणित)",
      "code": "MATH12",
      "icon": "📐",
      "chapters": [
        {
          "id": "ch-12-1",
          "chapterNumber": 1,
          "title": "Relations and Functions",
          "titleHindi": "संबंध एवं फलन",
          "description": "Reflexive, symmetric, transitive relations, equivalence relations, one-one (injective) and onto (surjective) functions.",
          "icon": "🔗",
          "color": "from-blue-600 to-indigo-600",
          "summary": "A relation is an Equivalence Relation if it is Reflexive, Symmetric, and Transitive. A function is Bijective if it is both Injective and Surjective.",
          "exercises": [
            {
              "id": "ex-12-1-1",
              "exerciseNumber": "Exercise 1.1",
              "title": "Equivalence Relations",
              "questions": [
                {
                  "id": "q-12-1-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Show that the relation R in the set A = {1, 2, 3, 4, 5} given by R = {(a, b) : |a - b| is even} is an equivalence relation.",
                  "keyConcept": "Verify Reflexive, Symmetric, and Transitive properties.",
                  "difficulty": "Medium",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Reflexivity Check",
                      "content": "For any \\( a \\in A \\), \\( |a - a| = 0 \\) which is even. Thus, \\( (a, a) \\in R \\). (Reflexive)"
                    },
                    {
                      "stepNumber": 2,
                      "title": "Symmetry Check",
                      "content": "If \\( (a, b) \\in R \\), then \\( |a - b| \\) is even. \\( |b - a| = |-(a - b)| = |a - b| \\) is also even. Thus, \\( (b, a) \\in R \\). (Symmetric)"
                    },
                    {
                      "stepNumber": 3,
                      "title": "Transitivity Check",
                      "content": "If \\( |a - b| \\) and \\( |b - c| \\) are even, their sum \\( (a - b) + (b - c) = a - c \\) is also even. Thus \\( (a, c) \\in R \\). (Transitive)"
                    }
                  ],
                  "finalAnswer": "R is Reflexive, Symmetric, and Transitive, hence an Equivalence Relation."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-12-2",
          "chapterNumber": 2,
          "title": "Inverse Trigonometric Functions",
          "titleHindi": "प्रतिलोम त्रिकोणमितीय फलन",
          "description": "Principal value branches of sin⁻¹x, cos⁻¹x, tan⁻¹x, properties of inverse trigonometric functions.",
          "icon": "📐",
          "color": "from-purple-600 to-pink-600",
          "summary": "Domain of sin⁻¹x and cos⁻¹x is [-1, 1]. Principal branch of sin⁻¹x is [-π/2, π/2], cos⁻¹x is [0, π].",
          "exercises": [
            {
              "id": "ex-12-2-1",
              "exerciseNumber": "Exercise 2.1",
              "title": "Principal Values of Inverse Trig Functions",
              "questions": [
                {
                  "id": "q-12-2-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Find the principal value of \\( \\sin^{-1}\\left(-\\frac{1}{2}\\right) \\).",
                  "keyConcept": "\\( \\sin^{-1}(-x) = -\\sin^{-1}(x) \\) for \\( x \\in [-1, 1] \\).",
                  "difficulty": "Easy",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Evaluate principal branch value",
                      "content": "Let \\( y = \\sin^{-1}\\left(-\\frac{1}{2}\\right) \\implies \\sin y = -\\frac{1}{2} = -\\sin\\left(\\frac{\\pi}{6}\\right) = \\sin\\left(-\\frac{\\pi}{6}\\right) \\)."
                    }
                  ],
                  "finalAnswer": "\\( -\\frac{\\pi}{6} \\)."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-12-3",
          "chapterNumber": 3,
          "title": "Matrices",
          "titleHindi": "आव्यूह",
          "description": "Order of matrix, addition, scalar multiplication, matrix multiplication, transpose, symmetric and skew-symmetric matrices.",
          "icon": "🔢",
          "color": "from-indigo-600 to-blue-600",
          "summary": "Matrix multiplication (AB) is defined only when columns of A = rows of B. In general, AB ≠ BA.",
          "exercises": [
            {
              "id": "ex-12-3-1",
              "exerciseNumber": "Exercise 3.1",
              "title": "Matrix Multiplication & Transpose",
              "questions": [
                {
                  "id": "q-12-3-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "If \\( A = \\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix} \\) and \\( B = \\begin{bmatrix} 2 & 0 \\\\ 1 & 3 \\end{bmatrix} \\), find \\( AB \\).",
                  "keyConcept": "Row-by-column matrix multiplication rule.",
                  "difficulty": "Medium",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Multiply Row 1 by Columns 1 and 2",
                      "content": "\\[ c_{11} = 1(2) + 2(1) = 4, \\quad c_{12} = 1(0) + 2(3) = 6 \\]"
                    },
                    {
                      "stepNumber": 2,
                      "title": "Multiply Row 2 by Columns 1 and 2",
                      "content": "\\[ c_{21} = 3(2) + 4(1) = 10, \\quad c_{22} = 3(0) + 4(3) = 12 \\]"
                    }
                  ],
                  "finalAnswer": "\\( AB = \\begin{bmatrix} 4 & 6 \\\\ 10 & 12 \\end{bmatrix} \\)."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-12-4",
          "chapterNumber": 4,
          "title": "Determinants",
          "titleHindi": "सारणिक",
          "description": "Determinant of 2x2 and 3x3 matrices, minors, cofactors, adjoint matrix, inverse A⁻¹ = (1/|A|) adj(A).",
          "icon": "🔳",
          "color": "from-cyan-600 to-teal-600",
          "summary": "A matrix A is non-singular if |A| ≠ 0. Only non-singular matrices possess an inverse.",
          "exercises": [
            {
              "id": "ex-12-4-1",
              "exerciseNumber": "Exercise 4.1",
              "title": "Inverse of a Matrix & Linear Systems",
              "questions": [
                {
                  "id": "q-12-4-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Find the inverse of the matrix \\( A = \\begin{bmatrix} 2 & 3 \\\\ 1 & 4 \\end{bmatrix} \\).",
                  "keyConcept": "\\( A^{-1} = \\frac{1}{|A|} \\text{adj}(A) \\).",
                  "difficulty": "Medium",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Calculate Determinants |A|",
                      "content": "\\[ |A| = (2)(4) - (3)(1) = 8 - 3 = 5 \\neq 0 \\]"
                    },
                    {
                      "stepNumber": 2,
                      "title": "Find Adjoint of 2x2 matrix",
                      "content": "\\[ \\text{adj}(A) = \\begin{bmatrix} 4 & -3 \\\\ -1 & 2 \\end{bmatrix} \\]"
                    },
                    {
                      "stepNumber": 3,
                      "title": "Compute Inverse",
                      "content": "\\[ A^{-1} = \\frac{1}{5} \\begin{bmatrix} 4 & -3 \\\\ -1 & 2 \\end{bmatrix} \\]"
                    }
                  ],
                  "finalAnswer": "\\( A^{-1} = \\begin{bmatrix} 4/5 & -3/5 \\\\ -1/5 & 2/5 \\end{bmatrix} \\)."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-12-5",
          "chapterNumber": 5,
          "title": "Continuity and Differentiability",
          "titleHindi": "सांतत्य तथा अवकलनीयता",
          "description": "Continuity at a point, differentiability, chain rule, implicit differentiation, logarithmic differentiation, second order derivatives.",
          "icon": "⚡",
          "color": "from-emerald-600 to-green-600",
          "summary": "f is continuous at c if lim x->c f(x) = f(c). Differentiable functions are always continuous.",
          "exercises": [
            {
              "id": "ex-12-5-1",
              "exerciseNumber": "Exercise 5.1",
              "title": "Chain Rule & Logarithmic Differentiation",
              "questions": [
                {
                  "id": "q-12-5-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Differentiate \\( y = x^x \\) with respect to \\( x \\).",
                  "keyConcept": "Logarithmic differentiation: take natural log of both sides when variable is in exponent.",
                  "difficulty": "Hard",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Take natural logarithm on both sides",
                      "content": "\\[ \\ln y = \\ln(x^x) = x \\ln x \\]"
                    },
                    {
                      "stepNumber": 2,
                      "title": "Differentiate implicitly",
                      "content": "\\[ \\frac{1}{y} \\frac{dy}{dx} = \\frac{d}{dx}(x) \\ln x + x \\frac{d}{dx}(\\ln x) = 1 \\cdot \\ln x + x \\cdot \\frac{1}{x} = \\ln x + 1 \\]"
                    },
                    {
                      "stepNumber": 3,
                      "title": "Solve for dy/dx",
                      "content": "\\[ \\frac{dy}{dx} = y (1 + \\ln x) = x^x (1 + \\ln x) \\]"
                    }
                  ],
                  "finalAnswer": "\\( \\frac{dy}{dx} = x^x (1 + \\ln x) \\)."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-12-6",
          "chapterNumber": 6,
          "title": "Application of Derivatives",
          "titleHindi": "अवकलज के अनुप्रयोग",
          "description": "Rate of change, increasing & decreasing functions (f'(x) > 0 / f'(x) < 0), maxima & minima (first and second derivative tests).",
          "icon": "📈",
          "color": "from-amber-600 to-yellow-600",
          "summary": "At critical points f'(x) = 0. If f''(c) < 0, f has a local maximum at c; if f''(c) > 0, f has a local minimum.",
          "exercises": [
            {
              "id": "ex-12-6-1",
              "exerciseNumber": "Exercise 6.1",
              "title": "Maxima and Minima Problems",
              "questions": [
                {
                  "id": "q-12-6-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Find two positive numbers whose sum is 15 and the sum of whose squares is minimum.",
                  "keyConcept": "Formulate single variable function S(x) and set S'(x) = 0.",
                  "difficulty": "Medium",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Express sum of squares in one variable",
                      "content": "Let numbers be x and 15 - x.\n\\[ S(x) = x^2 + (15 - x)^2 = x^2 + 225 - 30x + x^2 = 2x^2 - 30x + 225 \\]"
                    },
                    {
                      "stepNumber": 2,
                      "title": "Find derivative and set to 0",
                      "content": "\\[ S'(x) = 4x - 30 = 0 \\implies x = 7.5 \\]"
                    },
                    {
                      "stepNumber": 3,
                      "title": "Verify minimum with 2nd derivative test",
                      "content": "\\[ S''(x) = 4 > 0 \\text{ (Minimum confirmed)} \\]"
                    }
                  ],
                  "finalAnswer": "The numbers are 7.5 and 7.5."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-12-7",
          "chapterNumber": 7,
          "title": "Integrals",
          "titleHindi": "समाकलन",
          "description": "Indefinite integrals, integration by substitution, trigonometric identities, partial fractions, integration by parts ∫ u dv = uv - ∫ v du, definite integrals.",
          "icon": "∫",
          "color": "from-red-600 to-rose-600",
          "summary": "Definite integral ∫_a^b f(x) dx represents net area under curve f(x) from x = a to x = b.",
          "exercises": [
            {
              "id": "ex-12-7-1",
              "exerciseNumber": "Exercise 7.1",
              "title": "Integration Techniques & Definite Integrals",
              "questions": [
                {
                  "id": "q-12-7-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Evaluate: \\( \\int x \\cos x \\, dx \\).",
                  "keyConcept": "Integration by parts formula: \\( \\int u v \\, dx = u \\int v \\, dx - \\int (u' \\int v \\, dx) \\, dx \\).",
                  "difficulty": "Medium",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Set ILATE choices for u and v",
                      "content": "Let \\( u = x \\) (algebraic) and \\( v = \\cos x \\) (trigonometric)."
                    },
                    {
                      "stepNumber": 2,
                      "title": "Apply Integration by Parts",
                      "content": "\\[ \\int x \\cos x \\, dx = x \\sin x - \\int 1 \\cdot \\sin x \\, dx = x \\sin x - (-\\cos x) + C = x \\sin x + \\cos x + C \\]"
                    }
                  ],
                  "finalAnswer": "\\( x \\sin x + \\cos x + C \\)."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-12-8",
          "chapterNumber": 8,
          "title": "Application of Integrals",
          "titleHindi": "समाकलन के अनुप्रयोग",
          "description": "Finding area bounded by simple curves (lines, circles, parabolas, ellipses) using vertical or horizontal strips.",
          "icon": "📉",
          "color": "from-orange-600 to-amber-600",
          "summary": "Area = ∫_a^b y dx for vertical strips, or ∫_c^d x dy for horizontal strips.",
          "exercises": [
            {
              "id": "ex-12-8-1",
              "exerciseNumber": "Exercise 8.1",
              "title": "Area Bounded by Curves",
              "questions": [
                {
                  "id": "q-12-8-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Find the area bounded by the circle \\( x^2 + y^2 = a^2 \\).",
                  "keyConcept": "Use symmetry (4 times the area in the first quadrant).",
                  "difficulty": "Medium",
                  "diagramSvg": "<svg viewBox=\"0 0 300 200\" width=\"100%\" height=\"170\" xmlns=\"http://www.w3.org/2000/svg\">\n  <line x1=\"20\" y1=\"160\" x2=\"280\" y2=\"160\" stroke=\"#64748b\" stroke-width=\"2\"/>\n  <line x1=\"40\" y1=\"180\" x2=\"40\" y2=\"20\" stroke=\"#64748b\" stroke-width=\"2\"/>\n  <path d=\"M 60 160 Q 150 20 240 160 Z\" fill=\"rgba(37, 99, 235, 0.3)\" stroke=\"#2563eb\" stroke-width=\"2.5\"/>\n  <line x1=\"60\" y1=\"160\" x2=\"60\" y2=\"120\" stroke=\"#ef4444\" stroke-width=\"2\" stroke-dasharray=\"3\"/>\n  <line x1=\"240\" y1=\"160\" x2=\"240\" y2=\"120\" stroke=\"#ef4444\" stroke-width=\"2\" stroke-dasharray=\"3\"/>\n  <text x=\"55\" y=\"180\" fill=\"#ef4444\" font-weight=\"bold\" font-size=\"13\">x = a</text>\n  <text x=\"235\" y=\"180\" fill=\"#ef4444\" font-weight=\"bold\" font-size=\"13\">x = b</text>\n  <text x=\"115\" y=\"110\" fill=\"#2563eb\" font-weight=\"bold\" font-size=\"14\">Area = ∫ y dx</text>\n</svg>",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Setup integral for first quadrant",
                      "content": "\\[ \\text{Area} = 4 \\int_{0}^{a} \\sqrt{a^2 - x^2} \\, dx \\]"
                    },
                    {
                      "stepNumber": 2,
                      "title": "Evaluate standard integral formula",
                      "content": "\\[ = 4 \\left[ \\frac{x}{2}\\sqrt{a^2-x^2} + \\frac{a^2}{2}\\sin^{-1}\\left(\\frac{x}{a}\\right) \\right]_{0}^{a} = 4 \\left[ 0 + \\frac{a^2}{2}\\cdot \\frac{\\pi}{2} - 0 \\right] = \\pi a^2 \\]"
                    }
                  ],
                  "finalAnswer": "\\( \\pi a^2 \\) sq units."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-12-9",
          "chapterNumber": 9,
          "title": "Differential Equations",
          "titleHindi": "अवकल समीकरण",
          "description": "Order (highest derivative order) and degree (power of highest derivative when polynomial in derivatives), variable separable method, homogeneous and linear differential equations.",
          "icon": "📐",
          "color": "from-teal-600 to-cyan-600",
          "summary": "First order linear DE dy/dx + P(x)y = Q(x) has integrating factor IF = e^(∫ P dx). Solution: y · IF = ∫ Q · IF dx + C.",
          "exercises": [
            {
              "id": "ex-12-9-1",
              "exerciseNumber": "Exercise 9.1",
              "title": "Solving Linear Differential Equations",
              "questions": [
                {
                  "id": "q-12-9-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Find the general solution of the differential equation: \\( \\frac{dy}{dx} + 2y = \\sin x \\).",
                  "keyConcept": "Identify P(x) = 2, Q(x) = sin x and compute Integrating Factor IF = e^(∫ P dx).",
                  "difficulty": "Hard",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Calculate Integrating Factor (IF)",
                      "content": "\\[ \\text{IF} = e^{\\int 2 \\, dx} = e^{2x} \\]"
                    },
                    {
                      "stepNumber": 2,
                      "title": "Write general solution formula",
                      "content": "\\[ y e^{2x} = \\int e^{2x} \\sin x \\, dx + C \\]"
                    },
                    {
                      "stepNumber": 3,
                      "title": "Evaluate integral using integration by parts",
                      "content": "\\[ \\int e^{2x} \\sin x \\, dx = \\frac{e^{2x}}{5} (2\\sin x - \\cos x) \\implies y = \\frac{1}{5}(2\\sin x - \\cos x) + C e^{-2x} \\]"
                    }
                  ],
                  "finalAnswer": "\\( y = \\frac{1}{5}(2\\sin x - \\cos x) + C e^{-2x} \\)."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-12-10",
          "chapterNumber": 10,
          "title": "Vector Algebra",
          "titleHindi": "सदिश बीजगणित",
          "description": "Magnitude |a|, unit vector â = a/|a|, dot product a·b = |a||b| cos θ, cross product a×b = |a||b| sin θ n̂.",
          "icon": "➡️",
          "color": "from-violet-600 to-purple-600",
          "summary": "Dot product gives a scalar (a·b = 0 means perpendicular). Cross product gives a vector perpendicular to both.",
          "exercises": [
            {
              "id": "ex-12-10-1",
              "exerciseNumber": "Exercise 10.1",
              "title": "Dot and Cross Products of Vectors",
              "questions": [
                {
                  "id": "q-12-10-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Find the angle θ between vectors \\( \\vec{a} = \\hat{i} + \\hat{j} - \\hat{k} \\) and \\( \\vec{b} = \\hat{i} - \\hat{j} + \\hat{k} \\).",
                  "keyConcept": "\\( \\cos \\theta = \\frac{\\vec{a} \\cdot \\vec{b}}{|\\vec{a}||\\vec{b}|} \\).",
                  "difficulty": "Medium",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Calculate dot product",
                      "content": "\\[ \\vec{a} \\cdot \\vec{b} = (1)(1) + (1)(-1) + (-1)(1) = 1 - 1 - 1 = -1 \\]"
                    },
                    {
                      "stepNumber": 2,
                      "title": "Calculate magnitudes",
                      "content": "\\[ |\\vec{a}| = \\sqrt{1^2+1^2+(-1)^2} = \\sqrt{3}, \\quad |\\vec{b}| = \\sqrt{1^2+(-1)^2+1^2} = \\sqrt{3} \\]"
                    },
                    {
                      "stepNumber": 3,
                      "title": "Calculate angle cos θ",
                      "content": "\\[ \\cos \\theta = \\frac{-1}{\\sqrt{3}\\sqrt{3}} = -\\frac{1}{3} \\implies \\theta = \\cos^{-1}\\left(-\\frac{1}{3}\\right) \\]"
                    }
                  ],
                  "finalAnswer": "\\( \\theta = \\cos^{-1}\\left(-\\frac{1}{3}\\right) \\)."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-12-11",
          "chapterNumber": 11,
          "title": "Three Dimensional Geometry",
          "titleHindi": "त्रि-विमीय ज्यामिति",
          "description": "Direction cosines (l, m, n), direction ratios (a, b, c), equation of a line in vector r = a + λb and Cartesian form.",
          "icon": "🧊",
          "color": "from-sky-600 to-indigo-600",
          "summary": "Shortest distance between two skew lines r = a₁ + λb₁ and r = a₂ + μb₂ is |(a₂ - a₁) · (b₁ × b₂)| / |b₁ × b₂|.",
          "exercises": [
            {
              "id": "ex-12-11-1",
              "exerciseNumber": "Exercise 11.1",
              "title": "Equation of Line in 3D Space",
              "questions": [
                {
                  "id": "q-12-11-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Find the Cartesian equation of the line passing through point \\( (1, 2, 3) \\) and parallel to vector \\( 3\\hat{i} + 2\\hat{j} - 2\\hat{k} \\).",
                  "keyConcept": "Cartesian equation form: \\( \\frac{x - x_1}{a} = \\frac{y - y_1}{b} = \\frac{z - z_1}{c} \\).",
                  "difficulty": "Easy",
                  "diagramSvg": "<svg viewBox=\"0 0 300 240\" width=\"100%\" height=\"200\" xmlns=\"http://www.w3.org/2000/svg\">\n  <line x1=\"150\" y1=\"120\" x2=\"280\" y2=\"120\" stroke=\"#ef4444\" stroke-width=\"2.5\"/>\n  <text x=\"270\" y=\"140\" fill=\"#ef4444\" font-weight=\"bold\" font-size=\"14\">Y-axis</text>\n  <line x1=\"150\" y1=\"120\" x2=\"150\" y2=\"20\" stroke=\"#2563eb\" stroke-width=\"2.5\"/>\n  <text x=\"160\" y=\"35\" fill=\"#2563eb\" font-weight=\"bold\" font-size=\"14\">Z-axis</text>\n  <line x1=\"150\" y1=\"120\" x2=\"40\" y2=\"200\" stroke=\"#10b981\" stroke-width=\"2.5\"/>\n  <text x=\"25\" y=\"215\" fill=\"#10b981\" font-weight=\"bold\" font-size=\"14\">X-axis</text>\n  <circle cx=\"210\" cy=\"70\" r=\"5\" fill=\"#f59e0b\"/>\n  <text x=\"220\" y=\"65\" fill=\"#f59e0b\" font-weight=\"bold\" font-size=\"13\">P(x, y, z)</text>\n</svg>",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Substitute point and direction ratios",
                      "content": "\\[ \\frac{x - 1}{3} = \\frac{y - 2}{2} = \\frac{z - 3}{-2} \\]"
                    }
                  ],
                  "finalAnswer": "\\( \\frac{x - 1}{3} = \\frac{y - 2}{2} = \\frac{z - 3}{-2} \\)."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-12-12",
          "chapterNumber": 12,
          "title": "Linear Programming",
          "titleHindi": "रैखिक प्रोग्रामन",
          "description": "Formulation of LPP, objective function Z = ax + by, linear constraints, feasible region, corner point method.",
          "icon": "📊",
          "color": "from-emerald-600 to-teal-600",
          "summary": "The optimal value (maximum or minimum) of an objective function occurs at one of the corner points of the bounded feasible region.",
          "exercises": [
            {
              "id": "ex-12-12-1",
              "exerciseNumber": "Exercise 12.1",
              "title": "Graphical LPP Optimization",
              "questions": [
                {
                  "id": "q-12-12-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Maximize \\( Z = 4x + y \\) subject to constraints: \\( x + y \\le 50 \\), \\( 3x + y \\le 90 \\), \\( x \\ge 0, y \\ge 0 \\).",
                  "keyConcept": "Plot constraint lines, shade feasible region, and evaluate Z at corner points.",
                  "difficulty": "Medium",
                  "diagramSvg": "<svg viewBox=\"0 0 300 220\" width=\"100%\" height=\"180\" xmlns=\"http://www.w3.org/2000/svg\">\n  <line x1=\"30\" y1=\"190\" x2=\"270\" y2=\"190\" stroke=\"#64748b\" stroke-width=\"2\"/>\n  <line x1=\"40\" y1=\"200\" x2=\"40\" y2=\"20\" stroke=\"#64748b\" stroke-width=\"2\"/>\n  <polygon points=\"40,190 40,90 140,40 220,190\" fill=\"rgba(16, 185, 129, 0.3)\" stroke=\"#10b981\" stroke-width=\"2\"/>\n  <circle cx=\"40\" cy=\"190\" r=\"4\" fill=\"#2563eb\"/>\n  <circle cx=\"40\" cy=\"90\" r=\"4\" fill=\"#2563eb\"/>\n  <circle cx=\"140\" cy=\"40\" r=\"4\" fill=\"#ef4444\"/>\n  <circle cx=\"220\" cy=\"190\" r=\"4\" fill=\"#2563eb\"/>\n  <text x=\"100\" y=\"130\" fill=\"#047857\" font-weight=\"bold\" font-size=\"14\">Feasible Region</text>\n  <text x=\"145\" y=\"35\" fill=\"#ef4444\" font-weight=\"bold\" font-size=\"12\">Optimal Corner Point</text>\n</svg>",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Find corner points of feasible region",
                      "content": "Intersections of lines give corner points:\nO(0, 0), A(30, 0), B(20, 30), C(0, 50)."
                    },
                    {
                      "stepNumber": 2,
                      "title": "Evaluate Z = 4x + y at each corner point",
                      "content": "At O(0,0): Z = 0\nAt A(30,0): Z = 4(30) + 0 = 120\nAt B(20,30): Z = 4(20) + 30 = 110\nAt C(0,50): Z = 4(0) + 50 = 50."
                    }
                  ],
                  "finalAnswer": "Maximum value of Z is 120 at point (30, 0)."
                }
              ]
            }
          ]
        },
        {
          "id": "ch-12-13",
          "chapterNumber": 13,
          "title": "Probability",
          "titleHindi": "प्रायिकता",
          "description": "Conditional probability P(A|B) = P(A ∩ B)/P(B), independent events, Bayes' Theorem P(A_i|B) = P(A_i)P(B|A_i) / ∑ P(A_j)P(B|A_j), random variable distributions.",
          "icon": "🎲",
          "color": "from-rose-600 to-pink-600",
          "summary": "Bayes' Theorem calculates revised (posterior) probability of an event given prior probabilities and new evidence.",
          "exercises": [
            {
              "id": "ex-12-13-1",
              "exerciseNumber": "Exercise 13.1",
              "title": "Bayes' Theorem & Conditional Probability",
              "questions": [
                {
                  "id": "q-12-13-1-1",
                  "questionNumber": "Question 1",
                  "questionText": "Given that E and F are events such that P(E) = 0.6, P(F) = 0.3 and P(E ∩ F) = 0.2, find P(E|F) and P(F|E).",
                  "keyConcept": "\\( P(E|F) = \\frac{P(E \\cap F)}{P(F)} \\) and \\( P(F|E) = \\frac{P(E \\cap F)}{P(E)} \\).",
                  "difficulty": "Easy",
                  "steps": [
                    {
                      "stepNumber": 1,
                      "title": "Calculate P(E|F)",
                      "content": "\\[ P(E|F) = \\frac{0.2}{0.3} = \\frac{2}{3} \\]"
                    },
                    {
                      "stepNumber": 2,
                      "title": "Calculate P(F|E)",
                      "content": "\\[ P(F|E) = \\frac{0.2}{0.6} = \\frac{1}{3} \\]"
                    }
                  ],
                  "finalAnswer": "\\( P(E|F) = \\frac{2}{3} \\), \\( P(F|E) = \\frac{1}{3} \\)."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
];
