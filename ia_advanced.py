
from xgboost import XGBClassifier
import pandas as pd

# dataset ampliado simulado

dados = pd.DataFrame({
    'liquidez':[0.8,1.2,0.6,1.5],
    'margem':[0.08,0.15,0.05,0.20],
    'endividamento':[0.65,0.40,0.80,0.30],
    'inadimplente':[1,0,1,0]
})

X = dados[['liquidez','margem','endividamento']]
y = dados['inadimplente']

model = XGBClassifier()
model.fit(X, y)
