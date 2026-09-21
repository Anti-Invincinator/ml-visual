<div align="center">

# 🧠 ML Visual

[![Typing SVG](https://readme-typing-svg.demolab.com?font=JetBrains+Mono&size=22&pause=1500&color=3987E5&center=true&vCenter=true&width=600&lines=Algorithms%2C+from+scratch.;Distance+metrics+%C2%B7+Gradient+descent+%C2%B7+Backprop;SVMs+%C2%B7+K-means+%C2%B7+Decision+trees;Started+as+coursework+for+my+Masters+degree.)](https://git.io/typing-svg)

Machine learning, deep learning, and neural network algorithms — implemented from scratch, twice, and made explorable.

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![NumPy](https://img.shields.io/badge/NumPy-013243?style=for-the-badge&logo=numpy&logoColor=white)
![Jupyter](https://img.shields.io/badge/Jupyter-F37626?style=for-the-badge&logo=jupyter&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

</div>

* * *

## 🎓 Origin

This started as coursework for my Master's — the notebooks were how I actually learned each algorithm, by refusing to import it from a library until I could derive and code the math myself. It's grown past the syllabus since: this repo is the ongoing, running version, and it'll keep growing — supervised, unsupervised, and whatever else I end up wanting to understand from the ground up.

## 🎯 What this is

No `sklearn.fit()`, no `torch.nn.Linear`. Every algorithm here is built from first principles — the math is visible, not hidden behind a library call — and paired with a live, interactive visualization so you can watch it actually do the thing instead of reading about it.

Every algorithm lives in **two places**:

- 📓 **`notebooks/`** — the learning side. Each algorithm implemented from scratch in Python/numpy, with inline explanation of the math and step-by-step visualizations of it working.
- 🖥️ **`web/`** — the showcase side. A dark-mode Next.js site with the same algorithms reimplemented from scratch in TypeScript, running live in the browser — drag points, tweak parameters, watch it converge — plus side-by-side comparisons between related algorithms.

## 🗂️ Structure

```
ml-visual/
  notebooks/
    distance-metrics/
    gradient-descent/
    backpropagation/
    svm/
    kmeans/
    decision-trees/
    ...
  web/
    src/
      algorithms/        # from-scratch TS implementations, one folder per algorithm
      app/                # Next.js routes, one page per algorithm/category
      components/         # shared UI (nav, layout, design system primitives)
```

## 📊 Algorithms

| Algorithm | Category | Notebook | Web |
|---|---|:---:|:---:|
| Distance metrics (Euclidean, Manhattan, Chebyshev, Minkowski, Cosine) | Distance & search | ✅ | ✅ |
| Gradient descent (batch, momentum, noisy/SGD-style) | Optimization | ✅ | ✅ |
| Backpropagation (from-scratch MLP on XOR) | Neural networks | ✅ | ✅ |
| Support vector machines (linear vs. RBF kernel) | Classical ML — supervised | ✅ | ✅ |
| K-means clustering (random vs. k-means++ init) | Classical ML — unsupervised | ✅ | ✅ |
| Decision trees (CART, Gini impurity) | Classical ML — supervised | ✅ | ✅ |

### 🛣️ Roadmap

This is a running project, not a finished one — next up, roughly in order:

- **Supervised**: logistic regression, naive Bayes, random forests / boosting
- **Unsupervised**: PCA, hierarchical clustering, DBSCAN, autoencoders
- **Deep learning**: CNNs, RNNs/LSTMs, attention & transformers
- Open to suggestions — [open an issue](../../issues) if there's something you'd want to see explained this way.

## ⚙️ Running it

**Notebooks**

```bash
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
jupyter lab
```

**Web**

```bash
cd web
npm install
npm run dev
```

* * *

<div align="center">

![License](https://img.shields.io/badge/license-MIT-9085e9?style=for-the-badge)

📬 Built by [Dravid](https://www.linkedin.com/in/dravid) — kpdravid@gmail.com

</div>
