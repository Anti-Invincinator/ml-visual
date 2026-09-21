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
    name: "Foundations",
    description: "The building blocks underneath almost everything else here.",
    algorithms: [
      {
        slug: "distance-metrics",
        name: "Distance metrics",
        description:
          "Euclidean, Manhattan, Chebyshev, Minkowski, and cosine — compared live on draggable points.",
        status: "live",
      },
      {
        slug: "gradient-descent",
        name: "Gradient descent",
        description: "Batch, momentum, and noisy/SGD-style variants racing live on a loss surface.",
        status: "live",
      },
    ],
  },
  {
    name: "Search & optimization",
    description: "Finding good solutions without a gradient to follow.",
    algorithms: [
      {
        slug: "genetic-algorithms",
        name: "Genetic algorithms",
        description: "A population evolving past local minima that trap plain gradient descent.",
        status: "live",
      },
      {
        slug: "simulated-annealing",
        name: "Simulated annealing",
        description: "Accepting worse moves early, on purpose, cooling down over time.",
        status: "live",
      },
      {
        slug: "particle-swarm",
        name: "Particle swarm optimization",
        description: "A swarm pulled toward its own best find and the group's best find.",
        status: "soon",
      },
      {
        slug: "graph-search",
        name: "Graph search",
        description: "BFS, DFS, Greedy, A*, and Dijkstra — pick your algorithm on one interactive map.",
        status: "live",
      },
      {
        slug: "d-star",
        name: "D*",
        description: "Replanning a path when the map changes mid-traverse, without starting over.",
        status: "soon",
      },
    ],
  },
  {
    name: "Supervised",
    description: "Learning from labeled examples.",
    algorithms: [
      {
        slug: "svm",
        name: "Support vector machines",
        description: "Linear vs. RBF kernel, trained live side by side on the same data.",
        status: "live",
      },
      {
        slug: "decision-trees",
        name: "Decision trees",
        description: "Recursive splits carving up the feature space, live as depth grows.",
        status: "live",
      },
      {
        slug: "logistic-regression",
        name: "Logistic regression",
        description: "The linear decision boundary underneath most classifiers.",
        status: "soon",
      },
      {
        slug: "naive-bayes",
        name: "Naive Bayes",
        description: "Classifying by betting on conditional independence.",
        status: "soon",
      },
      {
        slug: "random-forests",
        name: "Random forests",
        description: "Many bad trees voting their way to a good answer.",
        status: "soon",
      },
    ],
  },
  {
    name: "Unsupervised",
    description: "Finding structure with no labels to check against.",
    algorithms: [
      {
        slug: "kmeans",
        name: "K-means clustering",
        description: "Random init vs. k-means++, converging live side by side.",
        status: "live",
      },
      {
        slug: "pca",
        name: "PCA",
        description: "Finding the axes that actually explain the variance.",
        status: "soon",
      },
      {
        slug: "hierarchical-clustering",
        name: "Hierarchical clustering",
        description: "Merging clusters bottom-up into a dendrogram.",
        status: "soon",
      },
      {
        slug: "dbscan",
        name: "DBSCAN",
        description: "Density-based clusters, no k required.",
        status: "soon",
      },
      {
        slug: "autoencoders",
        name: "Autoencoders",
        description: "Compressing data by learning to reconstruct it.",
        status: "soon",
      },
    ],
  },
  {
    name: "Deep learning",
    description: "Stacked layers, learned representations.",
    algorithms: [
      {
        slug: "backpropagation",
        name: "Backpropagation",
        description: "A 2-3-1 network learning XOR live, gradients derived by hand.",
        status: "live",
      },
      {
        slug: "cnns",
        name: "Convolutional networks",
        description: "Learned filters sliding across an image.",
        status: "soon",
      },
      {
        slug: "rnns-lstms",
        name: "RNNs & LSTMs",
        description: "Networks with memory, and why plain RNNs forget.",
        status: "soon",
      },
    ],
  },
  {
    name: "Transformers",
    description: "Attention, and what replaced recurrence.",
    algorithms: [
      {
        slug: "self-attention",
        name: "Self-attention",
        description: "Every token deciding which other tokens matter.",
        status: "soon",
      },
      {
        slug: "transformer-architecture",
        name: "Transformer architecture",
        description: "Attention, positional encoding, and feed-forward blocks stacked together.",
        status: "soon",
      },
    ],
  },
];

export function allAlgorithms(): AlgorithmEntry[] {
  return categories.flatMap((c) => c.algorithms);
}
