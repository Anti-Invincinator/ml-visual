export type AlgorithmStatus = "live" | "soon";

export interface AlgorithmEntry {
  slug: string;
  name: string;
  description: string;
  status: AlgorithmStatus;
}

export interface AlgorithmCategory {
  name: string;
  description: string;
  algorithms: AlgorithmEntry[];
}

export const categories: AlgorithmCategory[] = [
  {
    name: "Distance & search",
    description: "What \"close\" means, and why it's a choice.",
    algorithms: [
      {
        slug: "distance-metrics",
        name: "Distance metrics",
        description:
          "Euclidean, Manhattan, Chebyshev, Minkowski, and cosine — compared live on draggable points.",
        status: "live",
      },
    ],
  },
  {
    name: "Optimization",
    description: "How a model finds its way downhill.",
    algorithms: [
      {
        slug: "gradient-descent",
        name: "Gradient descent",
        description: "Batch, momentum, and noisy/SGD-style variants racing live on a loss surface.",
        status: "live",
      },
    ],
  },
  {
    name: "Neural networks",
    description: "The mechanics under the hood.",
    algorithms: [
      {
        slug: "backpropagation",
        name: "Backpropagation",
        description: "A 2-3-1 network learning XOR live, gradients derived by hand.",
        status: "live",
      },
    ],
  },
  {
    name: "Classical ML",
    description: "The algorithms that still power most production systems.",
    algorithms: [
      {
        slug: "svm",
        name: "Support vector machines",
        description: "Linear vs. RBF kernel, trained live side by side on the same data.",
        status: "live",
      },
      {
        slug: "kmeans",
        name: "K-means clustering",
        description: "Random init vs. k-means++, converging live side by side.",
        status: "live",
      },
      {
        slug: "decision-trees",
        name: "Decision trees",
        description: "Recursive splits carving up the feature space, live as depth grows.",
        status: "live",
      },
    ],
  },
];

export function allAlgorithms(): AlgorithmEntry[] {
  return categories.flatMap((c) => c.algorithms);
}
